import React, { useState, useCallback, useMemo, useRef } from 'react';
import MidiRow from './MidiRow';
import { Logger } from '../../../logger';

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

interface MidiControllerProps {
  hasPermission: boolean;
  availableDevices: MidiDevice[];
  isConnected: boolean;
  connectedDeviceName: string;
  lastActivity: MidiActivity | null;
  isLearning: boolean;
  isPreLearning: boolean;
  requestPermission: () => Promise<void>;
  connectToDevice: (deviceId: string) => void;
  disconnect: () => void;
  setLearning: (enabled: boolean) => void;
}

interface MidiComponentProps {
  onEffectToggle?: (effectName: string) => void;
  midiController: MidiControllerProps;
}

// Constants moved outside component - matching AudioEffects structure
const GRID_STYLE = { display: 'grid', gap: '10px' } as const;

const MidiComponent: React.FC<MidiComponentProps> = ({ midiController }) => {
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const connectingDeviceIdRef = useRef<string | null>(null);

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
  } = midiController;

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
      connectingDeviceIdRef.current = deviceId;
      connectToDevice(deviceId);
      // Reset connecting state after a short delay
      setTimeout(() => {
        setIsConnecting(false);
        connectingDeviceIdRef.current = null;
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
        connectingDeviceId={connectingDeviceIdRef.current ?? ''}
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
