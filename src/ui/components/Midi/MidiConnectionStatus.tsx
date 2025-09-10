import React, { useMemo, useCallback } from 'react';

interface MidiConnectionStatusProps {
  isConnected: boolean;
  deviceName: string;
  onDisconnect: () => void;
}

const CONTAINER_STYLE = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '16px',
  padding: '16px',
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
};

const STATUS_ROW_STYLE = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
};

const INDICATOR_BASE_STYLE = {
  width: '12px',
  height: '12px',
  borderRadius: '50%',
  flexShrink: 0,
} as const;

const STATUS_TEXT_STYLE = {
  fontSize: '16px',
  fontWeight: '600',
  margin: 0,
};

const DEVICE_NAME_STYLE = {
  fontSize: '14px',
  color: '#6b7280',
  margin: '4px 0 0 0',
};

const DISCONNECT_BUTTON_STYLE = {
  padding: '8px 16px',
  backgroundColor: '#ef4444',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  fontSize: '14px',
  fontWeight: '500',
  cursor: 'pointer',
  alignSelf: 'flex-start',
  transition: 'background-color 0.2s',
};

const CONNECTED_COLOR = '#10b981';
const DISCONNECTED_COLOR = '#ef4444';

const MidiConnectionStatus: React.FC<MidiConnectionStatusProps> = ({
  isConnected,
  deviceName,
  onDisconnect,
}) => {
  const indicatorStyle = useMemo(
    () => ({
      ...INDICATOR_BASE_STYLE,
      backgroundColor: isConnected ? CONNECTED_COLOR : DISCONNECTED_COLOR,
    }),
    [isConnected]
  );

  const statusText = useMemo(
    () => (isConnected ? 'Connected' : 'Disconnected'),
    [isConnected]
  );

  const statusTextStyle = useMemo(
    () => ({
      ...STATUS_TEXT_STYLE,
      color: isConnected ? CONNECTED_COLOR : DISCONNECTED_COLOR,
    }),
    [isConnected]
  );

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.currentTarget.style.backgroundColor = '#dc2626';
    },
    []
  );

  const handleMouseLeave = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.currentTarget.style.backgroundColor = '#ef4444';
    },
    []
  );

  const deviceInfo = useMemo(
    () =>
      deviceName ? <p style={DEVICE_NAME_STYLE}>Device: {deviceName}</p> : null,
    [deviceName]
  );

  const disconnectButton = useMemo(
    () =>
      isConnected ? (
        <button
          onClick={onDisconnect}
          style={DISCONNECT_BUTTON_STYLE}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          Disconnect
        </button>
      ) : null,
    [isConnected, onDisconnect, handleMouseEnter, handleMouseLeave]
  );

  return (
    <div style={CONTAINER_STYLE}>
      <div style={STATUS_ROW_STYLE}>
        <div style={indicatorStyle} />
        <div>
          <h3 style={statusTextStyle}>{statusText}</h3>
          {deviceInfo}
        </div>
      </div>
      {disconnectButton}
    </div>
  );
};

export default MidiConnectionStatus;
