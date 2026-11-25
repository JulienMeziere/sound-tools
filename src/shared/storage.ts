import {
  defaultParameterValues,
  isEffectName,
  mergeParameterValues,
  type ParameterValues,
} from './effects';
import { Logger } from './logger';
import type { MidiDevice, MidiMapping } from './midi';

// Storage keys are unchanged since v1.0 so existing user settings are kept.
const PARAMETERS_KEY = 'sound-tools-parameters';
const MIDI_DEVICES_KEY = 'sound-tools-midi-configurations';
const MIDI_LAST_ACTIVE_KEY = 'sound-tools-last-active-device';
// Note: MIDI permissions are read from Chrome itself (navigator.permissions);
// the v1.0 "sound-tools-midi-permissions" key is no longer used.

interface DeviceConfiguration {
  device: MidiDevice;
  mappings: MidiMapping[];
}

const read = async <T>(key: string): Promise<T | undefined> => {
  try {
    const result = await chrome.storage.local.get(key);
    return result[key] as T | undefined;
  } catch (error) {
    Logger.warn(`Failed to read "${key}" from storage:`, error);
    return undefined;
  }
};

const write = async (key: string, value: unknown): Promise<void> => {
  try {
    await chrome.storage.local.set({ [key]: value });
  } catch (error) {
    Logger.warn(`Failed to write "${key}" to storage:`, error);
  }
};

const isMidiMapping = (value: unknown): value is MidiMapping => {
  if (!value || typeof value !== 'object') return false;
  const m = value as Partial<MidiMapping>;
  const number = m.midiType === 'note' ? m.midiNote : m.midiCC;
  return (
    typeof m.id === 'string' &&
    (m.type === 'effect-toggle' || m.type === 'effect-parameter') &&
    isEffectName(m.effect) &&
    (m.midiType === 'note' || m.midiType === 'control') &&
    typeof m.midiChannel === 'number' &&
    typeof number === 'number'
  );
};

export const ParameterStorage = {
  async load(): Promise<ParameterValues> {
    return mergeParameterValues(
      defaultParameterValues(),
      await read(PARAMETERS_KEY)
    );
  },

  save: (values: ParameterValues): Promise<void> =>
    write(PARAMETERS_KEY, values),

  /** Called when another tab saved new parameter values. */
  onChange(listener: (values: ParameterValues) => void): void {
    chrome.storage.onChanged.addListener((changes, area) => {
      const change = changes[PARAMETERS_KEY];
      if (area === 'local' && change?.newValue) {
        listener(
          mergeParameterValues(defaultParameterValues(), change.newValue)
        );
      }
    });
  },
};

export const MidiStorage = {
  async getLastActiveDevice(): Promise<MidiDevice | null> {
    const device = await read<MidiDevice | null>(MIDI_LAST_ACTIVE_KEY);
    return device && typeof device.id === 'string' ? device : null;
  },

  setLastActiveDevice: (device: MidiDevice | null): Promise<void> =>
    write(MIDI_LAST_ACTIVE_KEY, device),

  async getDeviceMappings(deviceId: string): Promise<MidiMapping[]> {
    const devices =
      (await read<Record<string, DeviceConfiguration>>(MIDI_DEVICES_KEY)) ?? {};
    const mappings = devices[deviceId]?.mappings;
    return Array.isArray(mappings) ? mappings.filter(isMidiMapping) : [];
  },

  async setDeviceMappings(
    device: MidiDevice,
    mappings: MidiMapping[]
  ): Promise<void> {
    const devices =
      (await read<Record<string, DeviceConfiguration>>(MIDI_DEVICES_KEY)) ?? {};
    devices[device.id] = { device, mappings };
    await write(MIDI_DEVICES_KEY, devices);
  },
};
