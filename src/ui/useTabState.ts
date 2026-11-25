import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { EffectName } from '../shared/effects';
import { Logger } from '../shared/logger';
import {
  isTabStateBroadcast,
  type ContentRequest,
  type ContentResponse,
  type TabState,
} from '../shared/messages';
import type { MidiMapping, MidiTarget } from '../shared/midi';

export type Connection = 'loading' | 'ready' | 'unavailable';

export interface TabActions {
  setEffectEnabled(effect: EffectName, enabled: boolean): Promise<void>;
  setParameter(effect: EffectName, parameter: string, value: number): void;
  requestMidiPermission(): Promise<void>;
  connectMidi(deviceId: string): Promise<void>;
  disconnectMidi(): Promise<void>;
  setMidiLearning(enabled: boolean): Promise<void>;
  linkMidi(target: MidiTarget): Promise<void>;
  unlinkMidi(mapping: MidiMapping): Promise<void>;
  /** Asks the content script again (e.g. to look for media again). */
  retry(): Promise<void>;
  /** Reloads the tab, then reconnects to its new content script. */
  reloadTab(): Promise<void>;
}

/** The content script may still be loading right after a navigation. */
const CONNECT_RETRY_DELAYS_MS = [0, 300, 1000];
/** After a tab reload, the content script only starts once the page has loaded. */
const RELOAD_RETRY_DELAYS_MS = [500, 1000, 1500, 2000, 3000];

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => window.setTimeout(resolve, ms));

const sendToTab = (
  tabId: number,
  request: ContentRequest
): Promise<ContentResponse> =>
  chrome.tabs.sendMessage<ContentRequest, ContentResponse>(tabId, request);

/**
 * Mirrors the state of the active tab's content script and exposes the
 * actions the popup can perform on it.
 */
export const useTabState = (): {
  connection: Connection;
  state: TabState | null;
  actions: TabActions;
} => {
  const [connection, setConnection] = useState<Connection>('loading');
  const [state, setState] = useState<TabState | null>(null);
  const tabIdRef = useRef<number | null>(null);

  // Each connection attempt gets a number so a newer one cancels older ones.
  const attemptRef = useRef(0);

  const cancelAttempts = useCallback((): void => {
    attemptRef.current++;
  }, []);

  const connect = useCallback(
    async (retryDelaysMs: number[]): Promise<void> => {
      const attempt = ++attemptRef.current;
      const isStale = (): boolean => attempt !== attemptRef.current;
      setConnection('loading');

      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (isStale()) return;
      if (tab?.id === undefined) {
        setConnection('unavailable');
        return;
      }
      tabIdRef.current = tab.id;

      for (const delay of retryDelaysMs) {
        await sleep(delay);
        if (isStale()) return;
        try {
          const initialState = await sendToTab(tab.id, { action: 'getState' });
          if (isStale()) return;
          setState(initialState);
          setConnection('ready');
          return;
        } catch {
          // Content script not reachable (yet).
        }
      }
      if (!isStale()) setConnection('unavailable');
    },
    []
  );

  useEffect(() => {
    const onBroadcast = (
      message: unknown,
      sender: chrome.runtime.MessageSender
    ): void => {
      // Ignore updates coming from other tabs.
      if (isTabStateBroadcast(message) && sender.tab?.id === tabIdRef.current) {
        setState(message.state);
      }
    };
    chrome.runtime.onMessage.addListener(onBroadcast);
    void connect(CONNECT_RETRY_DELAYS_MS);

    return () => {
      cancelAttempts();
      chrome.runtime.onMessage.removeListener(onBroadcast);
    };
  }, [connect, cancelAttempts]);

  const request = useCallback(async (req: ContentRequest): Promise<void> => {
    const tabId = tabIdRef.current;
    if (tabId === null) return;
    try {
      setState(await sendToTab(tabId, req));
    } catch (error) {
      Logger.warn(`"${req.action}" failed:`, error);
    }
  }, []);

  // Slider moves fire very often: send at most one message per frame and
  // parameter, and update the UI optimistically.
  const pendingParameters = useRef(new Map<string, ContentRequest>());
  const frameRef = useRef<number | null>(null);

  const setParameter = useCallback(
    (effect: EffectName, parameter: string, value: number): void => {
      setState((previous) => {
        if (!previous) return previous;
        const parameters = structuredClone(previous.parameters);
        const effectValues = parameters[effect];
        if (effectValues) effectValues[parameter] = value;
        return { ...previous, parameters };
      });

      pendingParameters.current.set(`${effect}.${parameter}`, {
        action: 'setParameter',
        effect,
        parameter,
        value,
      });
      if (frameRef.current !== null) return;
      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null;
        const tabId = tabIdRef.current;
        const pending = [...pendingParameters.current.values()];
        pendingParameters.current.clear();
        if (tabId === null) return;
        // The response is ignored: the popup already shows the new value.
        pending.forEach((req) => {
          sendToTab(tabId, req).catch(() => {});
        });
      });
    },
    []
  );

  const actions = useMemo<TabActions>(
    () => ({
      setEffectEnabled: (effect, enabled) =>
        request({ action: 'setEffectEnabled', effect, enabled }),
      setParameter,
      requestMidiPermission: () => request({ action: 'midiRequestPermission' }),
      connectMidi: (deviceId) => request({ action: 'midiConnect', deviceId }),
      disconnectMidi: () => request({ action: 'midiDisconnect' }),
      setMidiLearning: (enabled) =>
        request({ action: 'midiSetLearning', enabled }),
      linkMidi: (target) => request({ action: 'midiLink', target }),
      unlinkMidi: (mapping) => request({ action: 'midiUnlink', mapping }),
      retry: () => connect(CONNECT_RETRY_DELAYS_MS),
      reloadTab: async () => {
        const tabId = tabIdRef.current;
        if (tabId === null) return connect(CONNECT_RETRY_DELAYS_MS);
        setState(null);
        try {
          await chrome.tabs.reload(tabId);
        } catch (error) {
          Logger.warn('Could not reload the tab:', error);
        }
        return connect(RELOAD_RETRY_DELAYS_MS);
      },
    }),
    [connect, request, setParameter]
  );

  return { connection, state, actions };
};
