import { Logger } from '../logger';

export interface MidiDevice {
  id: string;
  name: string;
}

export interface MidiActivity {
  type: 'note' | 'control' | 'unknown';
  message: string;
  timestamp: number;
  rawData: number[];
}

export interface MidiMapping {
  id: string; // Unique identifier for the UI element
  type: 'effect-toggle' | 'effect-parameter'; // Type of UI element
  effect: string; // Effect name (for both toggle and parameter)
  parameter?: string; // Parameter name (for parameter type only)
  midiType: 'note' | 'control'; // Type of MIDI message
  midiChannel: number; // MIDI channel (1-16)
  midiNote?: number; // Note number (for note type)
  midiCC?: number; // CC number (for control type)
}

export interface MidiControllerEvents {
  onEffectToggle: (effectName: string) => void;
  onConnectionChange: (isConnected: boolean, deviceName: string) => void;
  onPermissionChange: (granted: boolean) => void;
  onDevicesScanned: (devices: MidiDevice[]) => void;
  onMidiActivity: (activity: MidiActivity) => void;
  onMidiMappingTriggered: (mapping: MidiMapping, value: number) => void;
  onMidiMappingCreated: (mapping: MidiMapping) => void;
}

export class MidiController {
  private midiAccess: MIDIAccess | null = null;
  private isConnected = false;
  private connectedDeviceId: string | null = null;
  private connectedDeviceName: string | null = null;
  private availableDevices: MidiDevice[] = [];
  private hasPermission = false;
  private lastActivity: MidiActivity | null = null;
  private isLearning = false;
  private isLinked = false; // New linked mode
  private readonly midiMappings: Map<string, MidiMapping[]> = new Map(); // MIDI mapping storage - multiple mappings per MIDI control
  private readonly events: MidiControllerEvents;

  constructor(events: MidiControllerEvents) {
    this.events = events;
  }

  getConnectionStatus(): {
    isConnected: boolean;
    deviceName: string | null;
    hasPermission: boolean;
    availableDevices: MidiDevice[];
    lastActivity: MidiActivity | null;
    isLearning: boolean;
    isLinked: boolean;
    hasRecentActivity: boolean;
  } {
    return {
      isConnected: this.isConnected,
      deviceName: this.connectedDeviceName,
      hasPermission: this.hasPermission,
      availableDevices: [...this.availableDevices],
      lastActivity: this.isLearning ? this.lastActivity : null,
      isLearning: this.isLearning,
      isLinked: this.isLinked,
      hasRecentActivity: this.hasRecentActivity(),
    };
  }

  async requestMidiPermission(): Promise<boolean> {
    try {
      Logger.info('Requesting MIDI access permission...');

      // Check if Web MIDI API is supported
      if (!navigator.requestMIDIAccess) {
        throw new Error('Web MIDI API is not supported in this browser');
      }

      // Check if we're in a secure context
      if (!window.isSecureContext) {
        Logger.warn('Not in secure context, MIDI may not work');
      }

      // Log the current context for debugging
      Logger.info('Current context:', {
        isSecureContext: window.isSecureContext,
        origin: window.location?.origin || 'unknown',
        protocol: window.location?.protocol || 'unknown',
      });

      // Check MIDI permission status first (as per MDN documentation)
      if ('permissions' in navigator && 'query' in navigator.permissions) {
        try {
          const permissionStatus = await navigator.permissions.query({
            name: 'midi' as PermissionName,
          });
          Logger.info('MIDI permission status:', permissionStatus.state);

          if (permissionStatus.state === 'denied') {
            throw new Error(
              'MIDI permission was previously denied by the user'
            );
          }
        } catch (permissionError) {
          Logger.warn(
            'Could not query MIDI permission status:',
            permissionError
          );
          // Continue anyway, as some browsers might not support this
        }
      }

      // Request MIDI access with explicit options (following MDN documentation)
      this.midiAccess = await navigator.requestMIDIAccess({
        sysex: false, // Don't request system exclusive access initially
        software: true, // Include software synthesizers
      });

      this.hasPermission = true;

      // Scan for available devices
      this.scanDevices();

      Logger.info('MIDI permission granted');
      this.events.onPermissionChange(true);

      return true;
    } catch (error) {
      this.hasPermission = false;
      Logger.error('MIDI permission denied or failed:', error);

      // Log additional context for debugging
      if (error instanceof Error) {
        Logger.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack,
        });
      }

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

      // Only start listening if learning is enabled
      if (this.isLearning) {
        device.onmidimessage = (event: MIDIMessageEvent) => {
          this.handleMidiMessage(event);
        };
      }

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
    this.isLearning = false;
    this.lastActivity = null;
    this.midiMappings.clear();

    // Update linked state after clearing mappings
    this.updateLinkedState();
    const previousDeviceName = this.connectedDeviceName;
    this.connectedDeviceId = null;
    this.connectedDeviceName = null;

    Logger.info('MIDI disconnected from:', previousDeviceName);
    this.events.onConnectionChange(this.isConnected, '');
  }

  setLearning(enabled: boolean): void {
    this.isLearning = enabled;

    // Clear activity when disabling learning
    if (!enabled) {
      this.lastActivity = null;
    }

    // Update MIDI message listening based on learning or linked state
    this.updateMidiListening();

    Logger.info('MIDI learning:', enabled ? 'enabled' : 'disabled');
  }

  private updateMidiListening(): void {
    if (this.isConnected && this.midiAccess && this.connectedDeviceId) {
      const device = this.midiAccess.inputs.get(this.connectedDeviceId);
      if (device) {
        if (this.isLearning || this.isLinked) {
          // Start listening for MIDI messages
          device.onmidimessage = (event: MIDIMessageEvent) => {
            this.handleMidiMessage(event);
          };
        } else {
          // Stop listening for MIDI messages
          device.onmidimessage = null;
        }
      }
    }
  }

  requestMidiLink(targetId: string): void {
    if (!this.lastActivity) {
      Logger.warn(
        'No MIDI activity available for linking. Please move a MIDI control first.'
      );
      return;
    }

    // Create mapping immediately using lastActivity
    this.createMidiLinkFromActivity(targetId, this.lastActivity);
  }

  getMidiMappings(): MidiMapping[] {
    const allMappings: MidiMapping[] = [];
    for (const mappingArray of this.midiMappings.values()) {
      allMappings.push(...mappingArray);
    }
    return allMappings;
  }

  // Remove a specific MIDI mapping by MIDI key
  removeSpecificMapping(
    midiType: 'note' | 'control',
    midiChannel: number,
    midiValue: number
  ): boolean {
    const midiKey = this.getMidiKey(midiType, midiChannel, midiValue);
    const mappingArray = this.midiMappings.get(midiKey);

    if (mappingArray && mappingArray.length > 0) {
      // Remove the first mapping (or we could make this more specific)
      const removedMapping = mappingArray.shift();

      if (mappingArray.length === 0) {
        this.midiMappings.delete(midiKey);
      }

      this.updateLinkedState();
      Logger.info('Specific MIDI mapping removed:', removedMapping);
      return true;
    }
    return false;
  }

  hasRecentActivity(): boolean {
    return this.lastActivity !== null;
  }

  private updateLinkedState(): void {
    const hasActiveMappings = this.midiMappings.size > 0;
    const wasLinked = this.isLinked;
    this.isLinked = hasActiveMappings;

    // Log state change
    if (wasLinked !== this.isLinked) {
      Logger.info(
        'MIDI linked mode:',
        this.isLinked ? 'enabled (has mappings)' : 'disabled (no mappings)'
      );

      // Update MIDI listening when linked state changes
      this.updateMidiListening();
    }
  }

  private createMidiLinkFromActivity(
    targetId: string,
    activity: MidiActivity
  ): void {
    if (activity.type !== 'note' && activity.type !== 'control') {
      Logger.warn('Cannot create MIDI link from activity type:', activity.type);
      return;
    }

    // Extract MIDI data from the raw data
    const [status, data1] = activity.rawData;
    if (!status || data1 === undefined) {
      Logger.warn('Invalid MIDI data for linking:', activity.rawData);
      return;
    }

    const channel = (status & 0x0f) + 1;

    // Parse the target ID to determine mapping type
    // Format: "effect-toggle-distortion" or "effect-parameter-reverb-roomSize"
    const parts = targetId.split('-');

    if (parts.length < 3) {
      Logger.error('Invalid target ID format:', targetId);
      return;
    }

    const [part0, part1, effect, ...remainingParts] = parts;
    const type = `${part0}-${part1}`; // "effect-toggle" or "effect-parameter"
    const parameter =
      remainingParts.length > 0 ? remainingParts.join('-') : undefined; // handle multi-part parameter names

    if (!type || !effect) {
      Logger.error('Invalid target ID format:', targetId);
      return;
    }

    const mapping: MidiMapping = {
      id: targetId,
      type: type as 'effect-toggle' | 'effect-parameter',
      effect,
      midiType: activity.type,
      midiChannel: channel,
    };

    // Only add parameter if it exists
    if (parameter) {
      mapping.parameter = parameter;
    }

    if (activity.type === 'note') {
      mapping.midiNote = data1;
    } else if (activity.type === 'control') {
      mapping.midiCC = data1;
    }

    // Create a unique key for this MIDI input
    const midiKey = this.getMidiKey(mapping.midiType, channel, data1);

    // Store the mapping - add to array or create new array
    const existingMappings = this.midiMappings.get(midiKey) || [];
    existingMappings.push(mapping);
    this.midiMappings.set(midiKey, existingMappings);

    // Update linked state based on active mappings
    this.updateLinkedState();

    Logger.info('MIDI mapping created from last activity:', mapping);

    // Notify that a mapping was created
    this.events.onMidiMappingCreated(mapping);
  }

  private handleMidiMessage(event: MIDIMessageEvent): void {
    const data = Array.from(event.data || []);
    const [status, data1, data2] = data;

    // Parse MIDI message type and create activity
    const activity = this.parseMidiMessage(
      status || 0,
      data1 || 0,
      data2 || 0,
      data
    );

    // Only process if activity is not null (ignored messages return null)
    if (activity !== null) {
      // Check for existing mappings and trigger them
      this.checkMidiMappings(activity, status || 0, data1 || 0, data2 || 0);

      // Store activity and notify listeners (only if learning mode is active)
      if (this.isLearning) {
        this.lastActivity = activity;
        this.events.onMidiActivity(activity);
        Logger.info('MIDI Activity:', activity);
      }
    }
  }

  private checkMidiMappings(
    activity: MidiActivity,
    status: number,
    data1: number,
    data2: number
  ): void {
    const channel = (status & 0x0f) + 1;
    const midiKey = this.getMidiKey(
      activity.type as 'note' | 'control',
      channel,
      data1
    );

    const mappingArray = this.midiMappings.get(midiKey);
    if (mappingArray && mappingArray.length > 0) {
      // Process all mappings for this MIDI control
      for (const mapping of mappingArray) {
        // Skip note off messages for note mappings
        if (mapping.midiType === 'note' && (status & 0xf0) === 0x80) {
          continue;
        }

        // Skip note on with velocity 0 (which is note off)
        if (
          mapping.midiType === 'note' &&
          (status & 0xf0) === 0x90 &&
          data2 === 0
        ) {
          continue;
        }

        // Calculate the value based on MIDI message type
        let value: number;
        if (mapping.midiType === 'note') {
          // For notes, use velocity (0-127) and scale to 0-100
          value = Math.round((data2 / 127) * 100);

          // For effect toggles, bottom half = off, upper half = on
          if (mapping.type === 'effect-toggle') {
            value = data2 < 64 ? 0 : 1;
          }
        } else {
          // For controls, scale from 0-127 to 0-100
          const scaledValue = Math.round((data2 / 127) * 100);

          // For effect toggles, <50% = off, >=50% = on
          if (mapping.type === 'effect-toggle') {
            value = scaledValue < 50 ? 0 : 1;
            Logger.info(
              `Control toggle: CC=${data2}, scaled=${scaledValue}%, toggle=${value}`
            );
          } else {
            value = scaledValue;
          }
        }

        // Trigger the mapping
        this.events.onMidiMappingTriggered(mapping, value);
      }
    }
  }

  private getMidiKey(
    type: 'note' | 'control',
    channel: number,
    noteOrCC: number
  ): string {
    return `${type}-${channel}-${noteOrCC}`;
  }

  private parseMidiMessage(
    status: number,
    data1: number,
    data2: number,
    rawData: number[]
  ): MidiActivity | null {
    const timestamp = Date.now();
    const messageType = status & 0xf0;

    switch (messageType) {
      case 0x90: // Note On
        if (data2 === 0) {
          // Note On with velocity 0 is actually Note Off
          return {
            type: 'note',
            message: `${this.getNoteNameFromNumber(data1)}`,
            timestamp,
            rawData,
          };
        }
        return {
          type: 'note',
          message: `${this.getNoteNameFromNumber(data1)}`,
          timestamp,
          rawData,
        };

      case 0x80: // Note Off
        return {
          type: 'note',
          message: `${this.getNoteNameFromNumber(data1)}`,
          timestamp,
          rawData,
        };

      case 0xb0: {
        // Control Change
        return {
          type: 'control',
          message: `CC${data1}`,
          timestamp,
          rawData,
        };
      }

      case 0xc0: // Program Change - ignore these messages
        return null;

      case 0xe0: {
        // Pitch Bend
        return {
          type: 'control',
          message: 'Pitch Bend',
          timestamp,
          rawData,
        };
      }

      default:
        return {
          type: 'unknown',
          message: 'MIDI',
          timestamp,
          rawData,
        };
    }
  }

  private getNoteNameFromNumber(noteNumber: number): string {
    const noteNames = [
      'C',
      'C#',
      'D',
      'D#',
      'E',
      'F',
      'F#',
      'G',
      'G#',
      'A',
      'A#',
      'B',
    ];
    const octave = Math.floor(noteNumber / 12) - 1;
    const note = noteNames[noteNumber % 12];
    return `${note}${octave}`;
  }
}
