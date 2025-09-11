import React, { useState, useCallback, useMemo } from 'react';
import { useMidiController } from '../../hooks/useMidiController';
import MidiRow from './MidiRow';
import { Logger } from '../../../logger';

interface MidiComponentProps {
  onEffectToggle?: (effectName: string) => void;
}

// Constants moved outside component - matching AudioEffects structure
const GRID_STYLE = { display: 'grid', gap: '10px' } as const;

const MidiComponent: React.FC<MidiComponentProps> = () => {
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectingDeviceId, setConnectingDeviceId] = useState<string | null>(
    null
  );

  const {
    hasPermission,
    availableDevices,
    isConnected,
    connectedDeviceName,
    lastActivity,
    isLearning,
    isPreLearning,
    requestPermission,
    connectToDevice,
    disconnect,
    setLearning,
  } = useMidiController();

  const handleRequestPermission = useCallback(async (): Promise<void> => {
    setIsRequestingPermission(true);
    try {
      await requestPermission();
    } catch (error) {
      Logger.error('Permission request failed:', error);
    } finally {
      setIsRequestingPermission(false);
    }
  }, [requestPermission]);

  const handleDeviceSelect = useCallback(
    (deviceId: string): void => {
      setIsConnecting(true);
      setConnectingDeviceId(deviceId);
      connectToDevice(deviceId);
      // Reset connecting state after a short delay
      setTimeout(() => {
        setIsConnecting(false);
        setConnectingDeviceId(null);
      }, 1000);
    },
    [connectToDevice]
  );

  const handleDisconnect = useCallback((): void => {
    disconnect();
  }, [disconnect]);

  const midiRow = useMemo(
    () => (
      <MidiRow
        hasPermission={hasPermission}
        isConnected={isConnected}
        connectedDeviceName={connectedDeviceName}
        availableDevices={availableDevices}
        isRequesting={isRequestingPermission}
        isConnecting={isConnecting}
        connectingDeviceId={connectingDeviceId ?? ''}
        lastActivity={lastActivity}
        isLearning={isLearning}
        isPreLearning={isPreLearning}
        onRequestPermission={handleRequestPermission}
        onDeviceSelect={handleDeviceSelect}
        onDisconnect={handleDisconnect}
        onSetLearning={setLearning}
      />
    ),
    [
      hasPermission,
      isConnected,
      connectedDeviceName,
      availableDevices,
      isRequestingPermission,
      isConnecting,
      connectingDeviceId,
      lastActivity,
      isLearning,
      isPreLearning,
      handleRequestPermission,
      handleDeviceSelect,
      handleDisconnect,
      setLearning,
    ]
  );

  return (
    <div>
      <h3>MIDI Controller</h3>
      <div style={GRID_STYLE}>{midiRow}</div>
    </div>
  );
};

export default MidiComponent;
