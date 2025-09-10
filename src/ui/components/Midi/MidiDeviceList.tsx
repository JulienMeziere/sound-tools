import React, { useCallback, useMemo } from 'react';

interface MidiDevice {
  id: string;
  name: string;
}

interface MidiDeviceListProps {
  devices: MidiDevice[];
  onDeviceSelect: (deviceId: string) => void;
  isConnecting?: boolean;
  connectingDeviceId?: string;
}

const CONTAINER_STYLE = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '12px',
  padding: '16px',
};

const HEADER_STYLE = {
  margin: '0 0 16px 0',
  fontSize: '18px',
  fontWeight: '600',
  color: '#374151',
};

const DEVICE_ITEM_STYLE = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '12px 16px',
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  cursor: 'pointer',
  transition: 'all 0.2s',
};

const DEVICE_ITEM_HOVER_STYLE = {
  ...DEVICE_ITEM_STYLE,
  backgroundColor: '#f3f4f6',
  borderColor: '#d1d5db',
};

const DEVICE_NAME_STYLE = {
  fontSize: '14px',
  fontWeight: '500',
  color: '#374151',
};

const CONNECT_BUTTON_STYLE = {
  padding: '6px 12px',
  backgroundColor: '#10b981',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  fontSize: '12px',
  fontWeight: '500',
  cursor: 'pointer',
};

const CONNECTING_BUTTON_STYLE = {
  ...CONNECT_BUTTON_STYLE,
  backgroundColor: '#6b7280',
  cursor: 'not-allowed',
};

const EMPTY_STATE_STYLE = {
  textAlign: 'center' as const,
  padding: '32px 16px',
  color: '#6b7280',
  fontSize: '14px',
};

const MidiDeviceList: React.FC<MidiDeviceListProps> = ({
  devices,
  onDeviceSelect,
  isConnecting = false,
  connectingDeviceId,
}) => {
  const handleDeviceClick = useCallback(
    (deviceId: string): void => {
      if (!isConnecting) {
        onDeviceSelect(deviceId);
      }
    },
    [isConnecting, onDeviceSelect]
  );

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isConnecting) {
        Object.assign(e.currentTarget.style, DEVICE_ITEM_HOVER_STYLE);
      }
    },
    [isConnecting]
  );

  const handleMouseLeave = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      Object.assign(e.currentTarget.style, DEVICE_ITEM_STYLE);
    },
    []
  );

  const emptyState = useMemo(
    () => (
      <div style={CONTAINER_STYLE}>
        <h3 style={HEADER_STYLE}>Available MIDI Devices</h3>
        <div style={EMPTY_STATE_STYLE}>
          <p>🎹 No MIDI devices found</p>
          <p>Please connect a MIDI controller and try again.</p>
        </div>
      </div>
    ),
    []
  );

  const deviceItems = useMemo(
    () =>
      devices.map(device => {
        const isThisDeviceConnecting = connectingDeviceId === device.id;
        const buttonStyle =
          isConnecting && isThisDeviceConnecting
            ? CONNECTING_BUTTON_STYLE
            : CONNECT_BUTTON_STYLE;
        const buttonText = isThisDeviceConnecting ? 'Connecting...' : 'Connect';

        return (
          <div
            key={device.id}
            style={DEVICE_ITEM_STYLE}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <span style={DEVICE_NAME_STYLE}>{device.name}</span>
            <button
              onClick={() => handleDeviceClick(device.id)}
              style={buttonStyle}
              disabled={isConnecting}
            >
              {buttonText}
            </button>
          </div>
        );
      }),
    [
      devices,
      connectingDeviceId,
      isConnecting,
      handleDeviceClick,
      handleMouseEnter,
      handleMouseLeave,
    ]
  );

  if (devices.length === 0) {
    return emptyState;
  }

  return (
    <div style={CONTAINER_STYLE}>
      <h3 style={HEADER_STYLE}>Available MIDI Devices</h3>
      {deviceItems}
    </div>
  );
};

export default MidiDeviceList;
