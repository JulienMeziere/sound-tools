import { EFFECTS, isEffectName, type EffectName } from '../shared/effects';
import { Logger } from '../shared/logger';
import type {
  ContentRequest,
  TabState,
  TabStateBroadcast,
} from '../shared/messages';
import { AudioEngine } from './audio/AudioEngine';
import { MidiController } from './midi/MidiController';
import { notify } from './notifications';
import { ParameterState } from './ParameterState';

/** Coalesces bursts of changes (e.g. a MIDI knob sweep) into one popup update. */
const BROADCAST_INTERVAL_MS = 30;

const effectLabel = (name: EffectName): string =>
  EFFECTS.find((effect) => effect.name === name)?.label ?? name;

export class ContentController {
  private readonly parameters = new ParameterState(() => {
    this.audio.applyParameters(this.parameters.all);
    this.scheduleBroadcast();
  });

  private readonly audio = new AudioEngine(
    () => this.parameters.all,
    () => this.scheduleBroadcast()
  );

  private readonly midi = new MidiController({
    onStatusChange: () => this.scheduleBroadcast(),
    onToggle: (effect, enabled) => {
      const isEnabled = this.audio.enabledEffects.includes(effect);
      this.setEffectEnabled(
        effect,
        enabled === 'toggle' ? !isEnabled : enabled
      );
    },
    onParameter: (effect, parameter, value) => {
      this.setParameter(effect, parameter, value);
      this.scheduleBroadcast();
    },
  });

  private readonly ready: Promise<void>;
  private broadcastTimer: number | null = null;
  /** Media that played but isn't reachable with querySelectorAll (shadow DOM). */
  private hasPlayedMedia = false;

  constructor() {
    this.ready = this.parameters.load();
    chrome.runtime.onMessage.addListener(this.handleMessage);
    void this.restoreMidi();
    // Lets an open popup drop its "no audio found" notice as soon as media plays.
    document.addEventListener(
      'play',
      (event) => {
        if (event.composedPath()[0] instanceof HTMLMediaElement) {
          this.hasPlayedMedia = true;
          this.scheduleBroadcast();
        }
      },
      true
    );
  }

  private get state(): TabState {
    return {
      enabledEffects: this.audio.enabledEffects,
      parameters: this.parameters.all,
      audioSuspended: this.audio.isSuspended,
      hasMedia: this.audio.scanMedia() || this.hasPlayedMedia,
      midi: this.midi.status,
    };
  }

  private readonly handleMessage = (
    request: unknown,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: TabState) => void
  ): boolean => {
    if (!isContentRequest(request)) return false;
    this.handleRequest(request)
      .catch((error: unknown) => Logger.error('Request failed:', error))
      .finally(() => {
        try {
          sendResponse(this.state);
        } catch (error) {
          // Otherwise the popup would wait forever without any trace.
          Logger.error('Could not send the tab state:', error);
        }
      });
    return true; // keep the channel open for the async response
  };

  private async handleRequest(request: ContentRequest): Promise<void> {
    await this.ready;

    switch (request.action) {
      case 'getState':
        return;
      case 'setEffectEnabled':
        this.setEffectEnabled(request.effect, request.enabled);
        return;
      case 'setParameter':
        // No broadcast: the popup already shows the value it just sent.
        this.setParameter(request.effect, request.parameter, request.value);
        return;
      case 'midiRequestPermission': {
        const result = await this.midi.requestPermission();
        if (result === 'granted') notify('MIDI permission granted', 'success');
        else if (result === 'unavailable') {
          notify('MIDI is not available on this site in this browser', 'error');
        } else notify('MIDI permission denied', 'error');
        return;
      }
      case 'midiConnect':
        if (await this.midi.connect(request.deviceId)) {
          notify('MIDI device connected', 'success');
        } else {
          notify('Could not connect to the MIDI device', 'error');
        }
        return;
      case 'midiDisconnect':
        this.midi.disconnect(true);
        notify('MIDI device disconnected', 'info');
        return;
      case 'midiSetLearning':
        this.midi.setLearning(request.enabled);
        return;
      case 'midiLink':
        this.midi.link(request.target);
        return;
      case 'midiUnlink':
        this.midi.unlink(request.mapping);
        return;
    }
  }

  private setEffectEnabled(effect: EffectName, enabled: boolean): void {
    if (!this.audio.setEnabled(effect, enabled)) return;
    notify(
      `${effectLabel(effect)} ${enabled ? 'enabled' : 'disabled'}`,
      enabled ? 'success' : 'info'
    );
    this.scheduleBroadcast();
  }

  private setParameter(
    effect: EffectName,
    parameter: string,
    value: number
  ): void {
    const stored = this.parameters.set(effect, parameter, value);
    if (stored !== null) this.audio.setParameter(effect, parameter, stored);
  }

  private async restoreMidi(): Promise<void> {
    await this.ready;
    if (await this.midi.restore()) {
      notify('MIDI controller restored', 'success');
    }
  }

  private scheduleBroadcast(): void {
    if (this.broadcastTimer !== null) return;
    this.broadcastTimer = window.setTimeout(() => {
      this.broadcastTimer = null;
      const message: TabStateBroadcast = {
        type: 'sound-tools/state',
        state: this.state,
      };
      try {
        // Rejects when no popup is open: that's expected.
        chrome.runtime.sendMessage(message).catch(() => {});
      } catch {
        // Extension was reloaded/updated: this script is orphaned.
      }
    }, BROADCAST_INTERVAL_MS);
  }
}

const isContentRequest = (request: unknown): request is ContentRequest => {
  if (!request || typeof request !== 'object') return false;
  const { action, effect } = request as { action?: unknown; effect?: unknown };
  if (typeof action !== 'string') return false;
  if (action === 'setEffectEnabled' || action === 'setParameter') {
    return isEffectName(effect);
  }
  return true;
};
