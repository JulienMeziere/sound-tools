import type { EffectName } from './effects';

export interface MidiDevice {
  id: string;
  name: string;
}

export interface MidiActivity {
  type: 'note' | 'control';
  /** Human readable label, e.g. "C4" or "CC21" */
  message: string;
  channel: number;
  /** Note number or CC number */
  number: number;
}

/** What a MIDI control can be linked to in the popup. */
export type MidiTarget =
  | { type: 'effect-toggle'; effect: EffectName }
  | { type: 'effect-parameter'; effect: EffectName; parameter: string };

/**
 * Shape persisted in chrome.storage (kept identical to v1.0 for compatibility).
 * `id` is the target id, e.g. "effect-toggle-reverb" or "effect-parameter-filter-lowPassQ".
 */
export interface MidiMapping {
  id: string;
  type: MidiTarget['type'];
  effect: EffectName;
  parameter?: string;
  midiType: 'note' | 'control';
  midiChannel: number;
  midiNote?: number;
  midiCC?: number;
}

export interface MidiStatus {
  hasPermission: boolean;
  devices: MidiDevice[];
  connectedDevice: MidiDevice | null;
  isLearning: boolean;
  /** Last control moved while learning; it is what the next click links to. */
  lastActivity: MidiActivity | null;
  mappings: MidiMapping[];
}

export const targetId = (target: MidiTarget): string =>
  target.type === 'effect-toggle'
    ? `effect-toggle-${target.effect}`
    : `effect-parameter-${target.effect}-${target.parameter}`;

export const midiNumber = (mapping: MidiMapping): number | undefined =>
  mapping.midiType === 'note' ? mapping.midiNote : mapping.midiCC;

export const isSameMapping = (a: MidiMapping, b: MidiMapping): boolean =>
  a.id === b.id &&
  a.midiType === b.midiType &&
  a.midiChannel === b.midiChannel &&
  midiNumber(a) === midiNumber(b);

export const mappingLabel = (mapping: MidiMapping): string =>
  mapping.midiType === 'note'
    ? `Note ${mapping.midiNote}`
    : `CC${mapping.midiCC}`;

export const mappingKey = (mapping: MidiMapping): string =>
  `${mapping.id}|${mapping.midiType}|${mapping.midiChannel}|${midiNumber(mapping)}`;
