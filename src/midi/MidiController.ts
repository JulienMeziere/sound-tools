import { Logger } from '../logger';

export interface MidiDevice {
  id: string;
  name: string;
}

export interface MidiControllerEvents {
  onEffectToggle: (effectName: string) => void;
  onConnectionChange: (isConnected: boolean, deviceName: string) => void;
  onPermissionChange: (granted: boolean) => void;
  onDevicesScanned: (devices: MidiDevice[]) => void;
}

export class MidiController {
  private midiAccess: MIDIAccess | null = null;
  private isConnected = false;
  private connectedDeviceId: string | null = null;
  private connectedDeviceName: string | null = null;
  private availableDevices: MidiDevice[] = [];
  private hasPermission = false;
  private readonly events: MidiControllerEvents;

  constructor(events: MidiControllerEvents) {
    this.events = events;
  }

  getConnectionStatus(): {
    isConnected: boolean;
    deviceName: string | null;
    hasPermission: boolean;
    availableDevices: MidiDevice[];
  } {
    return {
      isConnected: this.isConnected,
      deviceName: this.connectedDeviceName,
      hasPermission: this.hasPermission,
      availableDevices: [...this.availableDevices],
    };
  }

  async requestMidiPermission(): Promise<boolean> {
    try {
      Logger.info('Requesting MIDI access permission...');

      // This will trigger the browser permission prompt
      this.midiAccess = await navigator.requestMIDIAccess();
      this.hasPermission = true;

      // Scan for available devices
      this.scanDevices();

      Logger.info('MIDI permission granted');
      this.events.onPermissionChange(true);

      return true;
    } catch (error) {
      this.hasPermission = false;
      Logger.error('MIDI permission denied or failed:', error);
      this.events.onPermissionChange(false);

      return false;
    }
  }

  scanDevices(): void {
    if (!this.midiAccess) {
      Logger.warn('Cannot scan devices: MIDI access not available');
      return;
    }

    this.availableDevices = Array.from(this.midiAccess.inputs.values()).map(
      (input: MIDIInput) => ({
        id: input.id,
        name: input.name ?? 'Unknown Device',
      })
    );

    Logger.info('MIDI devices scanned:', this.availableDevices);
    this.events.onDevicesScanned(this.availableDevices);
  }

  connectToDevice(deviceId: string): void {
    try {
      if (!this.midiAccess) {
        throw new Error('MIDI access not available');
      }

      const device = this.midiAccess.inputs.get(deviceId);
      if (!device) {
        throw new Error(`Device with ID ${deviceId} not found`);
      }

      // Disconnect from previous device if connected
      if (this.isConnected) {
        this.disconnect();
      }

      // Connect to the selected device
      device.onmidimessage = (event: MIDIMessageEvent) => {
        this.handleMidiMessage(event);
      };

      this.isConnected = true;
      this.connectedDeviceId = deviceId;
      this.connectedDeviceName = device.name ?? 'Unknown Device';

      Logger.info('MIDI connected successfully to:', this.connectedDeviceName);
      this.events.onConnectionChange(
        this.isConnected,
        this.connectedDeviceName
      );
    } catch (error) {
      this.isConnected = false;
      this.connectedDeviceId = null;
      this.connectedDeviceName = null;
      Logger.error('Failed to connect to MIDI device:', error);
      throw error;
    }
  }

  disconnect(): void {
    if (this.midiAccess && this.connectedDeviceId) {
      const device = this.midiAccess.inputs.get(this.connectedDeviceId);
      if (device) {
        device.onmidimessage = null;
      }
    }

    this.isConnected = false;
    const previousDeviceName = this.connectedDeviceName;
    this.connectedDeviceId = null;
    this.connectedDeviceName = null;

    Logger.info('MIDI disconnected from:', previousDeviceName);
    this.events.onConnectionChange(this.isConnected, '');
  }

  private handleMidiMessage(_event: MIDIMessageEvent): void {}
}
