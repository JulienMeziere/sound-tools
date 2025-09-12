import { Logger } from '../logger';

// Storage interfaces
export interface StoredMidiDevice {
  id: string;
  name: string;
}

export interface StoredMidiMapping {
  id: string;
  type: 'effect-toggle' | 'effect-parameter';
  effect: string;
  parameter?: string | undefined;
  midiType: 'note' | 'control';
  midiChannel: number;
  midiNote?: number | undefined;
  midiCC?: number | undefined;
}

export interface DeviceConfiguration {
  device: StoredMidiDevice;
  mappings: StoredMidiMapping[];
}

export interface MidiDevicesStorage {
  [deviceId: string]: DeviceConfiguration;
}

export interface MidiPermissions {
  [domain: string]: boolean; // true = granted, false = denied
}

// Legacy interface for backward compatibility
export interface MidiState {
  midiDevice?: StoredMidiDevice | undefined;
  midiMappings: StoredMidiMapping[];
}

// Storage keys
const MIDI_DEVICES_KEY = 'sound-tools-midi-configurations'; // Per-device configurations
const MIDI_LAST_ACTIVE_KEY = 'sound-tools-last-active-device'; // Last active device
const MIDI_PERMISSIONS_KEY = 'sound-tools-midi-permissions';

export class MidiStorageManager {
  // Set the last active device
  static async setLastActiveDevice(device: StoredMidiDevice): Promise<void> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.local.set({ [MIDI_LAST_ACTIVE_KEY]: device });
        Logger.info('Last active MIDI device set:', device);
      }
    } catch (error) {
      Logger.error('Failed to set last active MIDI device:', error);
    }
  }

  // Clear the last active device (on disconnect)
  static async clearLastActiveDevice(): Promise<void> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.local.set({ [MIDI_LAST_ACTIVE_KEY]: null });
        Logger.info('Last active MIDI device cleared');
      }
    } catch (error) {
      Logger.error('Failed to clear last active MIDI device:', error);
    }
  }

  // Get the last active device
  static async getLastActiveDevice(): Promise<StoredMidiDevice | null> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get(MIDI_LAST_ACTIVE_KEY);
        return result[MIDI_LAST_ACTIVE_KEY] || null;
      }
    } catch (error) {
      Logger.error('Failed to get last active MIDI device:', error);
    }
    return null;
  }

  // Save a MIDI mapping for a specific device
  static async saveMidiMapping(
    deviceId: string,
    mapping: StoredMidiMapping
  ): Promise<void> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const devices = await this.loadDevicesStorage();

        if (!devices[deviceId]) {
          Logger.warn(
            'Cannot save mapping: device configuration not found for',
            deviceId
          );
          return;
        }

        // Check if mapping already exists (by unique combination of MIDI control)
        const existingIndex = devices[deviceId].mappings.findIndex(
          (m) =>
            m.midiType === mapping.midiType &&
            m.midiChannel === mapping.midiChannel &&
            m.midiNote === mapping.midiNote &&
            m.midiCC === mapping.midiCC &&
            m.id === mapping.id
        );

        if (existingIndex >= 0) {
          // Update existing mapping
          devices[deviceId].mappings[existingIndex] = mapping;
        } else {
          // Add new mapping
          devices[deviceId].mappings.push(mapping);
        }

        await chrome.storage.local.set({ [MIDI_DEVICES_KEY]: devices });
        Logger.info('MIDI mapping saved to device storage:', {
          deviceId,
          mapping,
        });
      }
    } catch (error) {
      Logger.error('Failed to save MIDI mapping to storage:', error);
    }
  }

  // Remove a MIDI mapping from a specific device
  static async removeMidiMapping(
    deviceId: string,
    midiType: 'note' | 'control',
    midiChannel: number,
    midiValue: number
  ): Promise<void> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const devices = await this.loadDevicesStorage();

        if (!devices[deviceId]) {
          Logger.warn(
            'Cannot remove mapping: device configuration not found for',
            deviceId
          );
          return;
        }

        // Find and remove the first matching mapping
        const mappingIndex = devices[deviceId].mappings.findIndex(
          (m) =>
            m.midiType === midiType &&
            m.midiChannel === midiChannel &&
            ((midiType === 'note' && m.midiNote === midiValue) ||
              (midiType === 'control' && m.midiCC === midiValue))
        );

        if (mappingIndex >= 0) {
          const removedMapping = devices[deviceId].mappings[mappingIndex];
          devices[deviceId].mappings.splice(mappingIndex, 1);

          await chrome.storage.local.set({ [MIDI_DEVICES_KEY]: devices });
          Logger.info('MIDI mapping removed from device storage:', {
            deviceId,
            removedMapping,
          });
        }
      }
    } catch (error) {
      Logger.error('Failed to remove MIDI mapping from storage:', error);
    }
  }

  // Save or update a device configuration
  static async saveDeviceConfiguration(
    device: StoredMidiDevice,
    mappings: StoredMidiMapping[] = []
  ): Promise<void> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const devices = await this.loadDevicesStorage();

        devices[device.id] = {
          device,
          mappings,
        };

        await chrome.storage.local.set({ [MIDI_DEVICES_KEY]: devices });
        Logger.info('Device configuration saved:', {
          deviceId: device.id,
          mappingsCount: mappings.length,
        });
      }
    } catch (error) {
      Logger.error('Failed to save device configuration:', error);
    }
  }

  // Load a specific device configuration
  static async loadDeviceConfiguration(
    deviceId: string
  ): Promise<DeviceConfiguration | null> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const devices = await this.loadDevicesStorage();
        return devices[deviceId] || null;
      }
    } catch (error) {
      Logger.error('Failed to load device configuration:', error);
    }
    return null;
  }

  // Load all device configurations
  static async loadDevicesStorage(): Promise<MidiDevicesStorage> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get(MIDI_DEVICES_KEY);
        return result[MIDI_DEVICES_KEY] || {};
      }
    } catch (error) {
      Logger.error('Failed to load devices storage:', error);
    }
    return {};
  }

  // Load the complete MIDI state (legacy method - now uses last active device)
  static async loadMidiState(): Promise<MidiState> {
    try {
      const lastActiveDevice = await this.getLastActiveDevice();

      if (!lastActiveDevice) {
        return { midiMappings: [] };
      }

      const deviceConfig = await this.loadDeviceConfiguration(
        lastActiveDevice.id
      );

      if (!deviceConfig) {
        return {
          midiDevice: lastActiveDevice,
          midiMappings: [],
        };
      }

      return {
        midiDevice: deviceConfig.device,
        midiMappings: deviceConfig.mappings,
      };
    } catch (error) {
      Logger.error('Failed to load MIDI state from storage:', error);
    }

    return { midiMappings: [] };
  }

  // Clear all device configurations (use with caution)
  static async clearAllDeviceConfigurations(): Promise<void> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.local.remove(MIDI_DEVICES_KEY);
        await chrome.storage.local.remove(MIDI_LAST_ACTIVE_KEY);
        Logger.info('All device configurations cleared from storage');
      }
    } catch (error) {
      Logger.error(
        'Failed to clear device configurations from storage:',
        error
      );
    }
  }

  // Helper to extract domain from URL (including subdomain)
  private static getDomainFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname; // This includes subdomains (e.g., "music.youtube.com")
    } catch (error) {
      Logger.error('Failed to parse URL for domain extraction:', error);
      return url; // Fallback to original URL if parsing fails
    }
  }

  // Save MIDI permission for a domain
  static async saveMidiPermission(
    url: string,
    granted: boolean
  ): Promise<void> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const domain = this.getDomainFromUrl(url);
        const permissions = await this.loadMidiPermissions();

        permissions[domain] = granted;

        await chrome.storage.local.set({ [MIDI_PERMISSIONS_KEY]: permissions });
        Logger.info(
          `MIDI permission ${granted ? 'granted' : 'denied'} for domain:`,
          domain
        );
      }
    } catch (error) {
      Logger.error('Failed to save MIDI permission to storage:', error);
    }
  }

  // Get MIDI permission for a domain
  static async getMidiPermission(url: string): Promise<boolean | undefined> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const domain = this.getDomainFromUrl(url);
        const permissions = await this.loadMidiPermissions();

        return permissions[domain];
      }
    } catch (error) {
      Logger.error('Failed to get MIDI permission from storage:', error);
    }

    return undefined;
  }

  // Load all MIDI permissions
  static async loadMidiPermissions(): Promise<MidiPermissions> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get(MIDI_PERMISSIONS_KEY);
        const permissions = result[MIDI_PERMISSIONS_KEY] as
          | MidiPermissions
          | undefined;

        return permissions || {};
      }
    } catch (error) {
      Logger.error('Failed to load MIDI permissions from storage:', error);
    }

    return {};
  }

  // Remove MIDI permission for a domain
  static async removeMidiPermission(url: string): Promise<void> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const domain = this.getDomainFromUrl(url);
        const permissions = await this.loadMidiPermissions();

        delete permissions[domain];

        await chrome.storage.local.set({ [MIDI_PERMISSIONS_KEY]: permissions });
        Logger.info('MIDI permission removed for domain:', domain);
      }
    } catch (error) {
      Logger.error('Failed to remove MIDI permission from storage:', error);
    }
  }

  // Clear all MIDI permissions
  static async clearMidiPermissions(): Promise<void> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.local.remove(MIDI_PERMISSIONS_KEY);
        Logger.info('All MIDI permissions cleared from storage');
      }
    } catch (error) {
      Logger.error('Failed to clear MIDI permissions from storage:', error);
    }
  }
}
