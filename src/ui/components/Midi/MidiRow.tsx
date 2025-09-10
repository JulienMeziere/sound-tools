import React, { useCallback, useState } from 'react';

import MidiButton from './MidiButton';
import SettingsButton from '../AudioEffect/SettingsButton';

interface MidiDevice {
  id: string;
  name: string;
}

interface MidiRowProps {
  hasPermission: boolean;
  isConnected: boolean;
  connectedDeviceName?: string;
  availableDevices: MidiDevice[];
  isRequesting: boolean;
  isConnecting: boolean;
  connectingDeviceId: string;
  onRequestPermission: () => Promise<void>;
  onDeviceSelect: (deviceId: string) => void;
  onDisconnect: () => void;
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
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '12px',
  backgroundColor: 'rgba(76, 175, 80, 0.1)',
  border: '1px solid rgba(76, 175, 80, 0.3)',
  borderRadius: '4px',
  color: 'white',
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
} as const;

const MidiRow: React.FC<MidiRowProps> = ({
  hasPermission,
  isConnected,
  connectedDeviceName,
  availableDevices,
  isRequesting,
  isConnecting,
  connectingDeviceId,
  onRequestPermission,
  onDeviceSelect,
  onDisconnect,
}) => {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const toggleDetails = useCallback(() => {
    setIsDetailsOpen((prev) => !prev);
  }, []);

  const handleButtonClick = useCallback(() => {
    if (!hasPermission) {
      void onRequestPermission();
    } else {
      toggleDetails();
    }
  }, [hasPermission, onRequestPermission, toggleDetails]);

  const getButtonLabel = useCallback(() => {
    if (!hasPermission) return 'MIDI Permission';
    if (isConnected) return `MIDI: ${connectedDeviceName}`;
    return 'MIDI Controller';
  }, [hasPermission, isConnected, connectedDeviceName]);

  const renderDetails = useCallback(() => {
    if (!hasPermission || !isDetailsOpen) return null;

    if (isConnected && connectedDeviceName) {
      return (
        <div style={DETAILS_CONTAINER_STYLE}>
          <div style={CONNECTED_INFO_STYLE}>
            <span>🎹 Connected to: {connectedDeviceName}</span>
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
    isConnecting,
    connectingDeviceId,
    onDisconnect,
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
