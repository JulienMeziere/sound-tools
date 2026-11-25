import type { EffectName } from '../../shared/effects';
import { Logger } from '../../shared/logger';
import {
  isSameMapping,
  midiNumber,
  targetId,
  type MidiActivity,
  type MidiDevice,
  type MidiMapping,
  type MidiStatus,
  type MidiTarget,
} from '../../shared/midi';
import { MidiStorage } from '../../shared/storage';

export interface MidiControllerEvents {
  /** Any change of the MIDI status (devices, connection, learning, mappings). */
  onStatusChange(): void;
  onToggle(effect: EffectName, enabled: boolean | 'toggle'): void;
  onParameter(effect: EffectName, parameter: string, value: number): void;
}

const NOTE_NAMES = 'C C# D D# E F F# G G# A A# B'.split(' ');
const noteName = (note: number): string =>
  `${NOTE_NAMES[note % 12]}${Math.floor(note / 12) - 1}`;

/**
 * Ids of the MIDI inputs.
 *
 * Firefox content scripts see page objects through Xray wrappers, which can't
 * enumerate maplike objects such as MIDIInputMap (iterators and forEach both
 * throw). There, only the id strings are read from the unwrapped page-side map;
 * every input is then fetched again through the safe wrapper with get(), so a
 * page tampering with its own MIDIInputMap can at worst hide devices.
 */
const inputIds = (inputs: MIDIInputMap): string[] => {
  const { XPCNativeWrapper } = globalThis as {
    XPCNativeWrapper?: { unwrap<T>(object: T): T };
  };
  const enumerable = XPCNativeWrapper
    ? XPCNativeWrapper.unwrap(inputs)
    : inputs;
  return Array.from(enumerable.keys(), String);
};

const NOTE_OFF = 0x80;
const NOTE_ON = 0x90;
const CONTROL_CHANGE = 0xb0;

/**
 * Web MIDI lives in the content script because MIDI permission is granted
 * per website (the popup cannot prompt for it).
 */
export class MidiController {
  private access: MIDIAccess | null = null;
  private input: MIDIInput | null = null;
  private device: MidiDevice | null = null;
  private isLearning = false;
  private lastActivity: MidiActivity | null = null;
  private mappings: MidiMapping[] = [];

  constructor(private readonly events: MidiControllerEvents) {}

  get status(): MidiStatus {
    return {
      hasPermission: this.access !== null,
      devices: this.listDevices(),
      connectedDevice: this.device,
      isLearning: this.isLearning,
      lastActivity: this.isLearning ? this.lastActivity : null,
      mappings: [...this.mappings],
    };
  }

  /**
   * Asks the user for MIDI access (shows the browser's permission prompt).
   * 'unavailable': the browser refused without asking the user — e.g. Firefox,
   * which only grants Web MIDI through a per-site "site permission add-on".
   */
  async requestPermission(): Promise<'granted' | 'denied' | 'unavailable'> {
    if (!navigator.requestMIDIAccess) {
      Logger.warn('Web MIDI API is not supported here');
      return 'unavailable';
    }
    try {
      this.access = await navigator.requestMIDIAccess({ sysex: false });
      this.access.onstatechange = this.handleStateChange;
      Logger.info('MIDI access granted');
      await this.reconnectLastDevice();
      return 'granted';
    } catch (error) {
      Logger.warn('MIDI access denied:', error);
      // No instanceof: the DOMException may come from another compartment (Firefox Xrays).
      const message = String((error as { message?: unknown } | null)?.message);
      return message.includes('site permission add-on')
        ? 'unavailable'
        : 'denied';
    } finally {
      this.events.onStatusChange();
    }
  }

  /**
   * Silently restores MIDI on page load when this site already has the
   * permission (no prompt is ever shown from here).
   * Returns true when the last used device was reconnected.
   */
  async restore(): Promise<boolean> {
    try {
      const status = await navigator.permissions.query({ name: 'midi' });
      if (status.state !== 'granted') return false;
    } catch {
      return false;
    }
    await this.requestPermission();
    return this.device !== null;
  }

  async connect(deviceId: string): Promise<boolean> {
    const input = this.access?.inputs.get(deviceId);
    if (!input || input.state === 'disconnected') {
      Logger.warn('MIDI device not found:', deviceId);
      return false;
    }

    this.detachInput();
    this.input = input;
    this.input.onmidimessage = this.handleMidiMessage;
    this.device = { id: input.id, name: input.name ?? 'Unknown device' };
    this.mappings = await MidiStorage.getDeviceMappings(input.id);
    void MidiStorage.setLastActiveDevice(this.device);

    Logger.info(
      `Connected to ${this.device.name} (${this.mappings.length} mappings)`
    );
    this.events.onStatusChange();
    return true;
  }

  /** `forget` is true when the user explicitly disconnected the device. */
  disconnect(forget: boolean): void {
    this.detachInput();
    this.device = null;
    this.mappings = [];
    this.isLearning = false;
    this.lastActivity = null;
    if (forget) void MidiStorage.setLastActiveDevice(null);
    this.events.onStatusChange();
  }

  setLearning(enabled: boolean): void {
    this.isLearning = enabled && this.device !== null;
    this.lastActivity = null;
    this.events.onStatusChange();
  }

  /** Links the last moved MIDI control to `target`. Ends learning mode. */
  link(target: MidiTarget): boolean {
    const activity = this.lastActivity;
    if (!activity || !this.device) return false;

    const mapping: MidiMapping = {
      id: targetId(target),
      type: target.type,
      effect: target.effect,
      ...(target.type === 'effect-parameter' && {
        parameter: target.parameter,
      }),
      midiType: activity.type,
      midiChannel: activity.channel,
      ...(activity.type === 'note'
        ? { midiNote: activity.number }
        : { midiCC: activity.number }),
    };

    if (!this.mappings.some((m) => isSameMapping(m, mapping))) {
      this.mappings.push(mapping);
      this.saveMappings();
    }
    this.setLearning(false);
    return true;
  }

  unlink(mapping: MidiMapping): boolean {
    const index = this.mappings.findIndex((m) => isSameMapping(m, mapping));
    if (index < 0) return false;
    this.mappings.splice(index, 1);
    this.saveMappings();
    this.events.onStatusChange();
    return true;
  }

  private saveMappings(): void {
    if (this.device) {
      void MidiStorage.setDeviceMappings(this.device, this.mappings);
    }
  }

  private listDevices(): MidiDevice[] {
    const { inputs } = this.access ?? {};
    if (!inputs) return [];
    return inputIds(inputs).flatMap((id) => {
      const input = inputs.get(id);
      return input && input.state !== 'disconnected'
        ? [{ id: input.id, name: input.name ?? 'Unknown device' }]
        : [];
    });
  }

  private detachInput(): void {
    if (this.input) this.input.onmidimessage = null;
    this.input = null;
  }

  private async reconnectLastDevice(): Promise<void> {
    if (this.device) return;
    const last = await MidiStorage.getLastActiveDevice();
    if (last && this.access?.inputs.get(last.id)?.state === 'connected') {
      await this.connect(last.id);
    }
  }

  /** A device was plugged or unplugged. */
  private readonly handleStateChange = (): void => {
    if (this.input?.state === 'disconnected') {
      Logger.info('MIDI device unplugged');
      this.disconnect(false);
    } else {
      void this.reconnectLastDevice();
    }
    this.events.onStatusChange();
  };

  private readonly handleMidiMessage = (event: MIDIMessageEvent): void => {
    const [status = 0, data1 = 0, data2 = 0] = event.data ?? [];
    const kind = status & 0xf0;
    const channel = (status & 0x0f) + 1;

    const isNoteOn = kind === NOTE_ON && data2 > 0;
    const isControl = kind === CONTROL_CHANGE;
    // Note-off messages (and everything else) are not used for mappings.
    if (!isNoteOn && !isControl) {
      if (kind !== NOTE_OFF && kind !== NOTE_ON) {
        Logger.debug('Ignored MIDI message', Array.from(event.data ?? []));
      }
      return;
    }

    const midiType = isNoteOn ? 'note' : 'control';
    const value = Math.round((data2 / 127) * 100);

    for (const mapping of this.mappings) {
      if (
        mapping.midiType !== midiType ||
        mapping.midiChannel !== channel ||
        midiNumber(mapping) !== data1
      ) {
        continue;
      }
      if (mapping.type === 'effect-toggle') {
        // Pads/keys toggle on each press; knobs/faders: lower half off, upper half on.
        this.events.onToggle(mapping.effect, isNoteOn ? 'toggle' : data2 >= 64);
      } else if (mapping.parameter) {
        this.events.onParameter(mapping.effect, mapping.parameter, value);
      }
    }

    if (this.isLearning) {
      this.lastActivity = {
        type: midiType,
        message: isNoteOn ? noteName(data1) : `CC${data1}`,
        channel,
        number: data1,
      };
      this.events.onStatusChange();
    }
  };
}
