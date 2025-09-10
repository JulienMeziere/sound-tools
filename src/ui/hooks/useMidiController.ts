import { useState, useEffect, useCallback, useRef } from 'react';
import { Logger } from '../../logger';

interface MidiDevice {
  id: string;
  name: string;
}

interface UseMidiControllerReturn {
  hasPermission: boolean;
  availableDevices: MidiDevice[];
  isConnected: boolean;
  connectedDeviceName: string;
  requestPermission: () => Promise<void>;
  connectToDevice: (deviceId: string) => void;
  disconnect: () => void;
}

// Constants
const RETRY_DELAY = 1000;
const GET_MIDI_STATUS_ACTION = 'getMidiStatus';
const REQUEST_MIDI_PERMISSION_ACTION = 'requestMidiPermission';
const CONNECT_TO_MIDI_DEVICE_ACTION = 'connectToMidiDevice';
const DISCONNECT_MIDI_ACTION = 'disconnectMidi';

// Helper function to send tab messages
const sendTabMessage = (
  tabId: number,
  message: Record<string, unknown>,
  callback?: (response: unknown) => void
): void => {
  if (callback) {
    void chrome.tabs.sendMessage(tabId, message, callback);
  } else {
    void chrome.tabs.sendMessage(tabId, message);
  }
};

// Helper function to get active tab
const getActiveTab = (callback: (tabId: number | undefined) => void): void => {
  void chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    callback(tabs[0]?.id);
  });
};

export const useMidiController = (): UseMidiControllerReturn => {
  const [hasPermission, setHasPermission] = useState(false);
  const [availableDevices, setAvailableDevices] = useState<MidiDevice[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectedDeviceName, setConnectedDeviceName] = useState('');

  // Use ref for cleanup timer to avoid stale closures
  const retryTimerRef = useRef<number | null>(null);

  const getMidiStatus = useCallback((tabId: number): void => {
    sendTabMessage(tabId, { action: GET_MIDI_STATUS_ACTION }, (response) => {
      if (chrome.runtime.lastError) {
        Logger.warn(
          'Content script not ready for MIDI:',
          chrome.runtime.lastError.message
        );
        return;
      }
      if (response && typeof response === 'object' && response !== null) {
        const resp = response as {
          hasPermission?: boolean;
          availableDevices?: MidiDevice[];
          isConnected?: boolean;
          deviceName?: string | null;
        };
        if (typeof resp.hasPermission === 'boolean') {
          setHasPermission(resp.hasPermission);
        }
        if (Array.isArray(resp.availableDevices)) {
          setAvailableDevices(resp.availableDevices);
        }
        if (typeof resp.isConnected === 'boolean') {
          setIsConnected(resp.isConnected);
        }
        if (typeof resp.deviceName === 'string') {
          setConnectedDeviceName(resp.deviceName);
        }
      }
    });
  }, []);

  const initializeMidi = useCallback((): void => {
    getActiveTab((tabId) => {
      if (typeof tabId === 'number') {
        getMidiStatus(tabId);
      }
    });
  }, [getMidiStatus]);

  useEffect(() => {
    // Try immediately, then retry after a short delay if needed
    initializeMidi();
    retryTimerRef.current = window.setTimeout(initializeMidi, RETRY_DELAY);

    return (): void => {
      if (retryTimerRef.current !== null) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, [initializeMidi]);

  const requestPermission = useCallback(
    async (): Promise<void> =>
      new Promise<void>((resolve, reject) => {
        getActiveTab((tabId) => {
          if (typeof tabId === 'number') {
            sendTabMessage(
              tabId,
              { action: REQUEST_MIDI_PERMISSION_ACTION },
              (_) => {
                if (chrome.runtime.lastError) {
                  Logger.error(
                    'Error requesting MIDI permission:',
                    chrome.runtime.lastError.message
                  );
                  reject(new Error(chrome.runtime.lastError.message));
                  return;
                }
                // Refresh status after permission request
                setTimeout(() => getMidiStatus(tabId), 500);
                resolve();
              }
            );
          } else {
            reject(new Error('No active tab found'));
          }
        });
      }),
    [getMidiStatus]
  );

  const connectToDevice = useCallback(
    (deviceId: string): void => {
      getActiveTab((tabId) => {
        if (typeof tabId === 'number') {
          sendTabMessage(
            tabId,
            { action: CONNECT_TO_MIDI_DEVICE_ACTION, deviceId },
            () => {
              if (chrome.runtime.lastError) {
                Logger.error(
                  'Error connecting to MIDI device:',
                  chrome.runtime.lastError.message
                );
                return;
              }
              // Refresh status after connection
              setTimeout(() => getMidiStatus(tabId), 500);
            }
          );
        }
      });
    },
    [getMidiStatus]
  );

  const disconnect = useCallback((): void => {
    getActiveTab((tabId) => {
      if (typeof tabId === 'number') {
        sendTabMessage(tabId, { action: DISCONNECT_MIDI_ACTION }, () => {
          // Refresh status after disconnection
          setTimeout(() => getMidiStatus(tabId), 500);
        });
      }
    });
  }, [getMidiStatus]);

  return {
    hasPermission,
    availableDevices,
    isConnected,
    connectedDeviceName,
    requestPermission,
    connectToDevice,
    disconnect,
  };
};
