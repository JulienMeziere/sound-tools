import { useState, useEffect, useCallback, useRef } from 'react';
import { Logger } from '../../logger';

interface MidiDevice {
  id: string;
  name: string;
}

interface MidiActivity {
  type: 'note' | 'control' | 'unknown';
  message: string;
  timestamp: number;
  rawData: number[];
}

interface UseMidiControllerReturn {
  hasPermission: boolean;
  availableDevices: MidiDevice[];
  isConnected: boolean;
  connectedDeviceName: string;
  lastActivity: MidiActivity | null;
  isLearning: boolean;
  isLinked: boolean;
  isPreLearning: boolean;
  requestPermission: () => Promise<void>;
  connectToDevice: (deviceId: string) => void;
  disconnect: () => void;
  setLearning: (enabled: boolean) => void;
  requestMidiLink: (targetId: string) => void;
}

// Constants
const RETRY_DELAY = 1000;
const GET_MIDI_STATUS_ACTION = 'getMidiStatus';
const REQUEST_MIDI_PERMISSION_ACTION = 'requestMidiPermission';
const CONNECT_TO_MIDI_DEVICE_ACTION = 'connectToMidiDevice';
const DISCONNECT_MIDI_ACTION = 'disconnectMidi';
const SET_MIDI_LEARNING_ACTION = 'setMidiLearning';
const REQUEST_MIDI_LINK_ACTION = 'requestMidiLink';

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
  const [lastActivity, setLastActivity] = useState<MidiActivity | null>(null);
  const [isLearning, setIsLearning] = useState(false);
  const [isLinked, setIsLinked] = useState(false);
  const [hasRecentActivity, setHasRecentActivity] = useState(false);
  const [isPreLearning, setIsPreLearning] = useState(false);

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
          lastActivity?: MidiActivity | null;
          isLearning?: boolean;
          isLinked?: boolean;
          hasRecentActivity?: boolean;
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
        if (resp.lastActivity !== undefined) {
          setLastActivity(resp.lastActivity);
        }
        if (typeof resp.isLearning === 'boolean') {
          setIsLearning(resp.isLearning);
        }
        if (typeof resp.isLinked === 'boolean') {
          setIsLinked(resp.isLinked);
        }
        if (typeof resp.hasRecentActivity === 'boolean') {
          setHasRecentActivity(resp.hasRecentActivity);
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

    // Set up message listener for real-time updates from content script
    const messageListener = (
      message: { type?: string; data?: unknown },
      sender: chrome.runtime.MessageSender
    ) => {
      // Only process messages from content scripts
      if (sender.tab && message.type === 'midiStatusUpdate') {
        const update = message.data as {
          hasPermission?: boolean;
          availableDevices?: MidiDevice[];
          isConnected?: boolean;
          deviceName?: string | null;
          lastActivity?: MidiActivity | null;
          isLearning?: boolean;
          isLinked?: boolean;
          hasRecentActivity?: boolean;
        };

        if (typeof update.hasPermission === 'boolean') {
          setHasPermission(update.hasPermission);
        }
        if (Array.isArray(update.availableDevices)) {
          setAvailableDevices(update.availableDevices);
        }
        if (typeof update.isConnected === 'boolean') {
          setIsConnected(update.isConnected);
        }
        if (typeof update.deviceName === 'string') {
          setConnectedDeviceName(update.deviceName);
        }
        if (update.lastActivity !== undefined) {
          setLastActivity(update.lastActivity);
        }
        if (typeof update.isLearning === 'boolean') {
          setIsLearning(update.isLearning);
        }
        if (typeof update.isLinked === 'boolean') {
          setIsLinked(update.isLinked);
        }
        if (typeof update.hasRecentActivity === 'boolean') {
          setHasRecentActivity(update.hasRecentActivity);
        }
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);

    return (): void => {
      if (retryTimerRef.current !== null) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, [initializeMidi]);

  // Auto-transition from pre-learning to learning when MIDI activity is detected
  useEffect(() => {
    if (isPreLearning && hasRecentActivity) {
      setIsPreLearning(false);
      // Enable actual learning mode
      getActiveTab((tabId) => {
        if (typeof tabId === 'number') {
          sendTabMessage(tabId, {
            action: SET_MIDI_LEARNING_ACTION,
            enabled: true,
          });
        }
      });
    }
  }, [isPreLearning, hasRecentActivity]);

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

  const connectToDevice = useCallback((deviceId: string): void => {
    getActiveTab((tabId) => {
      if (typeof tabId === 'number') {
        sendTabMessage(tabId, {
          action: CONNECT_TO_MIDI_DEVICE_ACTION,
          deviceId,
        });
        // No need to manually refresh - we'll get real-time update via broadcast
      }
    });
  }, []);

  const disconnect = useCallback((): void => {
    getActiveTab((tabId) => {
      if (typeof tabId === 'number') {
        sendTabMessage(tabId, { action: DISCONNECT_MIDI_ACTION });
        // No need to manually refresh - we'll get real-time update via broadcast
      }
    });
  }, []);

  const setLearning = useCallback(
    (enabled: boolean): void => {
      if (enabled && !hasRecentActivity) {
        // Enter pre-learning state - show message until MIDI activity
        setIsPreLearning(true);
        // But still enable content script learning to detect activity
      } else if (enabled && hasRecentActivity) {
        // Clear pre-learning and enable actual learning
        setIsPreLearning(false);
      } else if (!enabled) {
        // Disable both pre-learning and learning
        setIsPreLearning(false);
      }

      // Always send learning state to content script when enabled (even in pre-learning)
      getActiveTab((tabId) => {
        if (typeof tabId === 'number') {
          sendTabMessage(tabId, { action: SET_MIDI_LEARNING_ACTION, enabled });
          // No need to manually refresh - we'll get real-time update via broadcast
        }
      });
    },
    [hasRecentActivity]
  );

  // Note: setLinked removed - linked state is now automatic based on active mappings

  const requestMidiLink = useCallback((targetId: string): void => {
    getActiveTab((tabId) => {
      if (typeof tabId === 'number') {
        sendTabMessage(tabId, { action: REQUEST_MIDI_LINK_ACTION, targetId });
      }
    });
  }, []);

  return {
    hasPermission,
    availableDevices,
    isConnected,
    connectedDeviceName,
    lastActivity,
    isLearning,
    isLinked,
    isPreLearning,
    requestPermission,
    connectToDevice,
    disconnect,
    setLearning,
    requestMidiLink,
  };
};
