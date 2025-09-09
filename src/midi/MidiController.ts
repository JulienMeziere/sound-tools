import { Logger } from '../logger';

export interface MidiControllerEvents {
  onEffectToggle: (effectName: string) => void;
  onConnectionChange: (isConnected: boolean, devices: string[]) => void;
}

export class MidiController {
  private midiAccess: MIDIAccess | null = null;
  private isConnected = false;
  private connectedDevices: string[] = [];
  private readonly events: MidiControllerEvents;

  constructor(events: MidiControllerEvents) {
    this.events = events;
  }

  getConnectionStatus(): { isConnected: boolean; devices: string[] } {
    return {
      isConnected: this.isConnected,
      devices: [...this.connectedDevices],
    };
  }

  async connect(): Promise<void> {
    try {
      this.midiAccess = await navigator.requestMIDIAccess();
      this.isConnected = true;

      this.connectedDevices = Array.from(this.midiAccess.inputs.values()).map(
        (input: MIDIInput) => input.name ?? 'Unknown Device'
      );

      this.midiAccess.inputs.forEach((input: MIDIInput) => {
        input.onmidimessage = (event: MIDIMessageEvent) => {
          this.handleMidiMessage(event);
        };
      });

      Logger.info('MIDI connected successfully', this.connectedDevices);
      this.events.onConnectionChange(this.isConnected, this.connectedDevices);
    } catch (error) {
      Logger.error('Failed to connect MIDI:', error);
      throw error;
    }
  }

  private handleMidiMessage(_event: MIDIMessageEvent): void {}
}
