import type { EffectName, ParameterValues } from './effects';
import type { MidiMapping, MidiStatus, MidiTarget } from './midi';

/** Everything the popup needs to render, owned by the content script of a tab. */
export interface TabState {
  enabledEffects: EffectName[];
  parameters: ParameterValues;
  /** True when Chrome's autoplay policy keeps audio processing paused until the page is clicked. */
  audioSuspended: boolean;
  /** False when the page has no <audio>/<video> element (nothing to process yet). */
  hasMedia: boolean;
  midi: MidiStatus;
}

/** Popup -> content script requests (sent with chrome.tabs.sendMessage). */
export type ContentRequest =
  | { action: 'getState' }
  | { action: 'setEffectEnabled'; effect: EffectName; enabled: boolean }
  | {
      action: 'setParameter';
      effect: EffectName;
      parameter: string;
      value: number;
    }
  | { action: 'midiRequestPermission' }
  | { action: 'midiConnect'; deviceId: string }
  | { action: 'midiDisconnect' }
  | { action: 'midiSetLearning'; enabled: boolean }
  | { action: 'midiLink'; target: MidiTarget }
  | { action: 'midiUnlink'; mapping: MidiMapping };

/** Every request is answered with the resulting tab state. */
export type ContentResponse = TabState;

/** Content script -> popup broadcast (sent with chrome.runtime.sendMessage). */
export interface TabStateBroadcast {
  type: 'sound-tools/state';
  state: TabState;
}

export const isTabStateBroadcast = (
  message: unknown
): message is TabStateBroadcast =>
  typeof message === 'object' &&
  message !== null &&
  (message as { type?: unknown }).type === 'sound-tools/state';
