import { Logger } from '../logger';
import {
  MidiStorageManager,
  StoredMidiMapping,
} from '../storage/MidiStorageManager';

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
  id: string;
  type: 'effect-toggle' | 'effect-parameter';
  effect: string;
  parameter?: string;
  midiType: 'note' | 'control';
  midiChannel: number;
  midiNote?: number;
  midiCC?: number;
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
  private isLinked = false;
  private readonly midiMappings: Map<string, MidiMapping[]> = new Map();
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

  async requestMidiPermission(url?: string): Promise<boolean> {
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

      // Check MIDI permission status first
      if ('permissions' in navigator && 'query' in navigator.permissions) {
        try {
          const permissionStatus = await navigator.permissions.query({
            name: 'midi' as PermissionName,
          });

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
        }
      }

      // Request MIDI access
      this.midiAccess = await navigator.requestMIDIAccess({
        sysex: false,
        software: true,
      });

      this.hasPermission = true;

      // Save permission to storage if URL provided
      if (url) {
        void MidiStorageManager.saveMidiPermission(url, true);
      }

      // Scan for available devices
      this.scanDevices();

      Logger.info('MIDI permission granted');
      this.events.onPermissionChange(true);

      return true;
    } catch (error) {
      this.hasPermission = false;
      Logger.error('MIDI permission denied or failed:', error);

      // Save permission denial to storage if URL provided
      if (url) {
        void MidiStorageManager.saveMidiPermission(url, false);
      }

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

  async connectToDevice(deviceId: string): Promise<void> {
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

      // Save as last active device and ensure device configuration exists
      const deviceInfo = {
        id: deviceId,
        name: this.connectedDeviceName,
      };

      void MidiStorageManager.setLastActiveDevice(deviceInfo);

      // Load existing configuration or create new one
      const existingConfig =
        await MidiStorageManager.loadDeviceConfiguration(deviceId);
      if (!existingConfig) {
        // Create new device configuration with empty mappings
        void MidiStorageManager.saveDeviceConfiguration(deviceInfo, []);
      } else {
        // Restore existing mappings for this device
        this.restoreMidiMappings(existingConfig.mappings);
        Logger.info(
          `Restored ${existingConfig.mappings.length} mappings for device:`,
          this.connectedDeviceName
        );
      }

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

  disconnect(clearLastActive = false, clearAllConfigurations = false): void {
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

    // Only clear the last active device if explicitly requested (user disconnect)
    if (clearLastActive) {
      void MidiStorageManager.clearLastActiveDevice();
    }

    // Only clear all device configurations if explicitly requested (rare case)
    if (clearAllConfigurations) {
      void MidiStorageManager.clearAllDeviceConfigurations();
      Logger.info(
        'All device configurations cleared from storage due to explicit request'
      );
    }

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

      // Remove mapping from device-specific storage
      if (this.connectedDeviceId) {
        void MidiStorageManager.removeMidiMapping(
          this.connectedDeviceId,
          midiType,
          midiChannel,
          midiValue
        );
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

  // Check if a MIDI mapping already exists
  private mappingExists(
    targetId: string,
    midiType: 'note' | 'control',
    midiChannel: number,
    midiValue: number
  ): boolean {
    const midiKey = this.getMidiKey(midiType, midiChannel, midiValue);
    const existingMappings = this.midiMappings.get(midiKey) || [];

    return existingMappings.some(
      (existing) =>
        existing.id === targetId &&
        existing.midiType === midiType &&
        existing.midiChannel === midiChannel &&
        ((midiType === 'note' && existing.midiNote === midiValue) ||
          (midiType === 'control' && existing.midiCC === midiValue))
    );
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

    // Check if this exact mapping already exists
    const midiValue = data1;
    if (this.mappingExists(targetId, mapping.midiType, channel, midiValue)) {
      Logger.warn('MIDI link already exists for this control and element:', {
        targetId,
        midiType: mapping.midiType,
        midiChannel: mapping.midiChannel,
        midiValue,
      });
      return;
    }

    // Create a unique key for this MIDI input
    const midiKey = this.getMidiKey(mapping.midiType, channel, data1);

    // Store the mapping - add to array or create new array
    const existingMappings = this.midiMappings.get(midiKey) || [];
    existingMappings.push(mapping);
    this.midiMappings.set(midiKey, existingMappings);

    // Save mapping to device-specific storage
    if (this.connectedDeviceId) {
      const storedMapping: StoredMidiMapping = {
        id: mapping.id,
        type: mapping.type,
        effect: mapping.effect,
        midiType: mapping.midiType,
        midiChannel: mapping.midiChannel,
        ...(mapping.parameter && { parameter: mapping.parameter }),
        ...(mapping.midiNote !== undefined && { midiNote: mapping.midiNote }),
        ...(mapping.midiCC !== undefined && { midiCC: mapping.midiCC }),
      };
      void MidiStorageManager.saveMidiMapping(
        this.connectedDeviceId,
        storedMapping
      );
    }

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

  // Restore MIDI state from storage
  async restoreMidiState(url: string): Promise<boolean> {
    try {
      Logger.info('Attempting to restore MIDI state for:', url);

      // Check if we have permission for this domain
      const hasPermission = await MidiStorageManager.getMidiPermission(url);

      if (hasPermission !== true) {
        Logger.info('No MIDI permission stored for domain, skipping restore');
        return false;
      }

      // Load saved MIDI state
      const midiState = await MidiStorageManager.loadMidiState();

      if (!midiState.midiDevice) {
        Logger.info('No MIDI device saved, skipping restore');
        return false;
      }

      // Request MIDI permission first (this should succeed since we have it stored)
      const permissionGranted = await this.requestMidiPermission(url);
      if (!permissionGranted) {
        Logger.warn('Failed to get MIDI permission during restore');
        return false;
      }

      // Try to reconnect to the saved device
      await this.connectToDevice(midiState.midiDevice.id);

      // Check if connection was successful
      if (!this.isConnected) {
        Logger.warn(
          'Failed to reconnect to saved MIDI device:',
          midiState.midiDevice.name
        );
        return false;
      }

      // Restore MIDI mappings
      this.restoreMidiMappings(midiState.midiMappings);

      Logger.info('MIDI state restored successfully');
      return true;
    } catch (error) {
      Logger.error('Failed to restore MIDI state:', error);
      return false;
    }
  }

  // Restore MIDI mappings from storage
  private restoreMidiMappings(storedMappings: StoredMidiMapping[]): void {
    try {
      Logger.info('Restoring MIDI mappings:', storedMappings.length);

      for (const storedMapping of storedMappings) {
        // Convert stored mapping back to internal mapping format
        const mapping: MidiMapping = {
          id: storedMapping.id,
          type: storedMapping.type,
          effect: storedMapping.effect,
          midiType: storedMapping.midiType,
          midiChannel: storedMapping.midiChannel,
          ...(storedMapping.parameter && {
            parameter: storedMapping.parameter,
          }),
          ...(storedMapping.midiNote !== undefined && {
            midiNote: storedMapping.midiNote,
          }),
          ...(storedMapping.midiCC !== undefined && {
            midiCC: storedMapping.midiCC,
          }),
        };

        // Create the MIDI key and store the mapping
        const midiValue = mapping.midiNote ?? mapping.midiCC;
        if (midiValue !== undefined) {
          // Check if this mapping already exists (prevent duplicates during restore)
          if (
            this.mappingExists(
              mapping.id,
              mapping.midiType,
              mapping.midiChannel,
              midiValue
            )
          ) {
            Logger.warn('Skipping duplicate mapping during restore:', mapping);
            continue;
          }

          const midiKey = this.getMidiKey(
            mapping.midiType,
            mapping.midiChannel,
            midiValue
          );

          // Add to existing mappings or create new array
          const existingMappings = this.midiMappings.get(midiKey) || [];
          existingMappings.push(mapping);
          this.midiMappings.set(midiKey, existingMappings);

          Logger.info('Restored MIDI mapping:', mapping);
        }
      }

      // Update linked state after restoring all mappings
      this.updateLinkedState();

      Logger.info('All MIDI mappings restored successfully');
    } catch (error) {
      Logger.error('Failed to restore MIDI mappings:', error);
    }
  }

  // Auto-restore after manual permission grant
  async autoRestoreAfterPermissionGrant(url: string): Promise<void> {
    try {
      Logger.info('Auto-restoring after permission grant for:', url);

      // Load saved MIDI state
      const midiState = await MidiStorageManager.loadMidiState();

      if (!midiState.midiDevice) {
        Logger.info('No MIDI device saved, skipping auto-restore');
        return;
      }

      // Try to reconnect to the saved device
      await this.connectToDevice(midiState.midiDevice.id);

      // Check if connection was successful
      if (!this.isConnected) {
        Logger.warn(
          'Failed to reconnect to saved MIDI device during auto-restore:',
          midiState.midiDevice.name
        );
        return;
      }

      // Restore MIDI mappings
      this.restoreMidiMappings(midiState.midiMappings);

      Logger.info('Auto-restore completed successfully');
    } catch (error) {
      Logger.error('Failed to auto-restore after permission grant:', error);
    }
  }
}
