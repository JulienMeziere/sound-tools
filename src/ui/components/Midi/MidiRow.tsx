import React, { useCallback, useState } from 'react';

import MidiButton from './MidiButton';
import SettingsButton from '../AudioEffect/SettingsButton';

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

interface MidiRowProps {
  hasPermission: boolean;
  isConnected: boolean;
  connectedDeviceName?: string;
  availableDevices: MidiDevice[];
  isRequesting: boolean;
  isConnecting: boolean;
  connectingDeviceId: string;
  lastActivity: MidiActivity | null;
  isLearning: boolean;
  onRequestPermission: () => Promise<void>;
  onDeviceSelect: (deviceId: string) => void;
  onDisconnect: () => void;
  onSetLearning: (enabled: boolean) => void;
}

// Constants moved outside component - matching EffectRow styling
const ROW_STYLE = {
  display: 'flex',
  gap: '8px',
  alignItems: 'center',
  width: '100%',
} as const;

const DETAILS_CONTAINER_STYLE = {
  marginTop: '8px',
  padding: '12px',
  backgroundColor: 'rgba(255, 255, 255, 0.05)',
  borderRadius: '4px',
  border: '1px solid rgba(255, 255, 255, 0.1)',
} as const;

const DEVICE_LIST_STYLE = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '8px',
} as const;

const DEVICE_BUTTON_STYLE = {
  padding: '8px 12px',
  backgroundColor: 'rgba(255, 255, 255, 0.1)',
  color: 'white',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '14px',
  transition: 'all 0.2s',
} as const;

const DEVICE_BUTTON_CONNECTING_STYLE = {
  ...DEVICE_BUTTON_STYLE,
  backgroundColor: 'rgba(255, 193, 7, 0.3)',
  borderColor: 'rgba(255, 193, 7, 0.5)',
} as const;

const CONNECTED_INFO_STYLE = {
  padding: '12px',
  backgroundColor: 'rgba(76, 175, 80, 0.1)',
  border: '1px solid rgba(76, 175, 80, 0.3)',
  borderRadius: '4px',
  color: 'white',
} as const;

const CONNECTED_TEXT_STYLE = {
  marginBottom: '12px',
  fontSize: '14px',
} as const;

const BUTTON_CONTAINER_STYLE = {
  display: 'flex',
  gap: '8px',
} as const;

const DISCONNECT_BUTTON_STYLE = {
  padding: '6px 12px',
  backgroundColor: 'rgba(244, 67, 54, 0.2)',
  color: 'white',
  border: '1px solid rgba(244, 67, 54, 0.4)',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '12px',
  transition: 'all 0.2s',
  flex: 1,
} as const;

const LEARN_BUTTON_STYLE = {
  padding: '6px 12px',
  backgroundColor: 'rgba(33, 150, 243, 0.2)',
  color: 'white',
  border: '1px solid rgba(33, 150, 243, 0.4)',
  borderColor: 'rgba(33, 150, 243, 0.4)',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '12px',
  transition: 'all 0.2s',
  flex: 1,
} as const;

const LEARN_BUTTON_ACTIVE_STYLE = {
  ...LEARN_BUTTON_STYLE,
  backgroundColor: '#00BCD4',
  borderColor: '#00BCD4',
  boxShadow: '0 0 8px rgba(0, 188, 212, 0.4)',
  fontWeight: '600',
} as const;

const ACTIVITY_CONTAINER_STYLE = {
  marginTop: '12px',
  padding: '8px',
  backgroundColor: 'rgba(255, 255, 255, 0.03)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '4px',
  fontSize: '12px',
  color: 'rgba(255, 255, 255, 0.8)',
} as const;

const ACTIVITY_HEADER_STYLE = {
  marginBottom: '6px',
  fontSize: '11px',
  color: 'rgba(255, 255, 255, 0.6)',
  fontWeight: '500',
} as const;

const ACTIVITY_MESSAGE_STYLE = {
  fontFamily: 'monospace',
  fontSize: '11px',
  color: 'rgba(255, 255, 255, 0.9)',
} as const;

const ACTIVITY_TYPE_COLORS = {
  note: '#4CAF50',
  control: '#00BCD4',
  unknown: '#9E9E9E',
} as const;

const MidiRow: React.FC<MidiRowProps> = ({
  hasPermission,
  isConnected,
  connectedDeviceName,
  availableDevices,
  isRequesting,
  isConnecting,
  connectingDeviceId,
  lastActivity,
  isLearning,
  onRequestPermission,
  onDeviceSelect,
  onDisconnect,
  onSetLearning,
}) => {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const toggleDetails = useCallback(() => {
    setIsDetailsOpen((prev) => !prev);
  }, []);

  const toggleLearning = useCallback(() => {
    onSetLearning(!isLearning);
  }, [isLearning, onSetLearning]);

  const handleButtonClick = useCallback(() => {
    if (!hasPermission) {
      void onRequestPermission();
    } else {
      toggleDetails();
    }
  }, [hasPermission, onRequestPermission, toggleDetails]);

  const getButtonLabel = useCallback(() => {
    if (!hasPermission) return 'Request MIDI Access';
    if (isConnected) return `MIDI: ${connectedDeviceName}`;
    return 'MIDI Controller';
  }, [hasPermission, isConnected, connectedDeviceName]);

  const renderDetails = useCallback(() => {
    if (!hasPermission || !isDetailsOpen) return null;

    if (isConnected && connectedDeviceName) {
      return (
        <div style={DETAILS_CONTAINER_STYLE}>
          <div style={CONNECTED_INFO_STYLE}>
            <div style={CONNECTED_TEXT_STYLE}>
              🎹 Connected to: {connectedDeviceName}
            </div>
            <div style={BUTTON_CONTAINER_STYLE}>
              <button
                onClick={onDisconnect}
                style={DISCONNECT_BUTTON_STYLE}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor =
                    'rgba(244, 67, 54, 0.3)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor =
                    'rgba(244, 67, 54, 0.2)';
                }}
              >
                Disconnect
              </button>
              <button
                onClick={toggleLearning}
                style={
                  isLearning ? LEARN_BUTTON_ACTIVE_STYLE : LEARN_BUTTON_STYLE
                }
                onMouseOver={(e) => {
                  if (!isLearning) {
                    e.currentTarget.style.backgroundColor =
                      'rgba(33, 150, 243, 0.3)';
                  }
                }}
                onMouseOut={(e) => {
                  if (!isLearning) {
                    e.currentTarget.style.backgroundColor =
                      'rgba(33, 150, 243, 0.2)';
                  }
                }}
              >
                {isLearning ? 'Learning...' : 'Learn'}
              </button>
            </div>
            {isConnected && isLearning && lastActivity && (
              <div style={ACTIVITY_CONTAINER_STYLE}>
                <div style={ACTIVITY_HEADER_STYLE}>Last MIDI Activity:</div>
                <div style={ACTIVITY_MESSAGE_STYLE}>
                  <span
                    style={{ color: ACTIVITY_TYPE_COLORS[lastActivity.type] }}
                  >
                    [{lastActivity.type.toUpperCase()}]
                  </span>{' '}
                  {lastActivity.message}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (availableDevices.length === 0) {
      return (
        <div style={DETAILS_CONTAINER_STYLE}>
          <p
            style={{
              margin: 0,
              color: 'rgba(255, 255, 255, 0.7)',
              textAlign: 'center',
            }}
          >
            No MIDI devices found. Make sure your MIDI controller is connected.
          </p>
        </div>
      );
    }

    return (
      <div style={DETAILS_CONTAINER_STYLE}>
        <div style={DEVICE_LIST_STYLE}>
          <h4 style={{ margin: '0 0 8px 0', color: 'white', fontSize: '14px' }}>
            Available MIDI Devices:
          </h4>
          {availableDevices.map((device) => {
            const isConnectingToThis =
              isConnecting && connectingDeviceId === device.id;
            return (
              <button
                key={device.id}
                onClick={() => onDeviceSelect(device.id)}
                style={
                  isConnectingToThis
                    ? DEVICE_BUTTON_CONNECTING_STYLE
                    : DEVICE_BUTTON_STYLE
                }
                disabled={isConnecting}
                onMouseOver={(e) => {
                  if (!isConnecting) {
                    e.currentTarget.style.backgroundColor =
                      'rgba(255, 255, 255, 0.2)';
                  }
                }}
                onMouseOut={(e) => {
                  if (!isConnecting && !isConnectingToThis) {
                    e.currentTarget.style.backgroundColor =
                      'rgba(255, 255, 255, 0.1)';
                  }
                }}
              >
                {isConnectingToThis
                  ? `Connecting to ${device.name}...`
                  : device.name}
              </button>
            );
          })}
        </div>
      </div>
    );
  }, [
    hasPermission,
    isDetailsOpen,
    isConnected,
    connectedDeviceName,
    availableDevices,
    onDisconnect,
    toggleLearning,
    isLearning,
    lastActivity,
    isConnecting,
    connectingDeviceId,
    onDeviceSelect,
  ]);

  return (
    <div>
      <div style={ROW_STYLE}>
        <MidiButton
          label={getButtonLabel()}
          isConnected={isConnected}
          onClick={handleButtonClick}
          disabled={isRequesting}
        />
        {hasPermission && (
          <SettingsButton isActive={isDetailsOpen} onClick={toggleDetails} />
        )}
      </div>
      {renderDetails()}
    </div>
  );
};

export default MidiRow;
