import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Logger } from '../../../logger';
import { MidiController, type MidiDevice } from '../../../midi/MidiController';
import MidiPermissionButton from './MidiPermissionButton';
import MidiDeviceList from './MidiDeviceList';
import MidiConnectionStatus from './MidiConnectionStatus';

type MidiFlowState = 'permission' | 'devices' | 'connected';

interface MidiComponentProps {
  onEffectToggle?: (effectName: string) => void;
}

const CONTAINER_STYLE = {
  marginBottom: '20px',
  padding: '16px',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  backgroundColor: '#ffffff',
} as const;

const MidiComponent: React.FC<MidiComponentProps> = ({ onEffectToggle }) => {
  const [flowState, setFlowState] = useState<MidiFlowState>('permission');
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectingDeviceId, setConnectingDeviceId] = useState<string | null>(
    null
  );
  const [availableDevices, setAvailableDevices] = useState<MidiDevice[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectedDeviceName, setConnectedDeviceName] = useState<string>('');
  const [midiController, _setMidiController] = useState(
    () =>
      new MidiController({
        onEffectToggle: (effectName: string) => {
          onEffectToggle?.(effectName);
        },
        onConnectionChange: (connected: boolean, deviceName: string) => {
          setIsConnected(connected);
          setConnectedDeviceName(deviceName);
          if (connected) {
            setFlowState('connected');
          }
          setIsConnecting(false);
          setConnectingDeviceId(null);
        },
        onPermissionChange: (granted: boolean) => {
          if (granted) {
            setFlowState('devices');
          }
          setIsRequestingPermission(false);
        },
        onDevicesScanned: (devices: MidiDevice[]) => {
          setAvailableDevices(devices);
        },
      })
  );

  useEffect(() => {
    // Check initial state
    const status = midiController.getConnectionStatus();
    if (status.hasPermission) {
      setFlowState(status.isConnected ? 'connected' : 'devices');
      setAvailableDevices(status.availableDevices);
      setIsConnected(status.isConnected);
      setConnectedDeviceName(status.deviceName || '');
    }
  }, [midiController]);

  const handleRequestPermission = useCallback(async (): Promise<void> => {
    setIsRequestingPermission(true);
    try {
      await midiController.requestMidiPermission();
    } catch (error) {
      Logger.error('Permission request failed:', error);
      setIsRequestingPermission(false);
    }
  }, [midiController]);

  const handleDeviceSelect = useCallback(
    (deviceId: string): void => {
      setIsConnecting(true);
      setConnectingDeviceId(deviceId);
      try {
        midiController.connectToDevice(deviceId);
      } catch (error) {
        Logger.error('Device connection failed:', error);
        setIsConnecting(false);
        setConnectingDeviceId(null);
      }
    },
    [midiController]
  );

  const handleDisconnect = useCallback((): void => {
    midiController.disconnect();
    setFlowState('devices');
  }, [midiController]);

  const permissionComponent = useMemo(
    () =>
      flowState === 'permission' ? (
        <MidiPermissionButton
          onRequestPermission={handleRequestPermission}
          isRequesting={isRequestingPermission}
        />
      ) : null,
    [flowState, handleRequestPermission, isRequestingPermission]
  );

  const deviceListComponent = useMemo(
    () =>
      flowState === 'devices' ? (
        <MidiDeviceList
          devices={availableDevices}
          onDeviceSelect={handleDeviceSelect}
          isConnecting={isConnecting}
          connectingDeviceId={connectingDeviceId ?? ''}
        />
      ) : null,
    [
      flowState,
      availableDevices,
      handleDeviceSelect,
      isConnecting,
      connectingDeviceId,
    ]
  );

  const connectionStatusComponent = useMemo(
    () =>
      flowState === 'connected' ? (
        <MidiConnectionStatus
          isConnected={isConnected}
          deviceName={connectedDeviceName}
          onDisconnect={handleDisconnect}
        />
      ) : null,
    [flowState, isConnected, connectedDeviceName, handleDisconnect]
  );

  return (
    <div style={CONTAINER_STYLE}>
      {permissionComponent}
      {deviceListComponent}
      {connectionStatusComponent}
    </div>
  );
};

export default MidiComponent;
