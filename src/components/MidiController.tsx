import React, { useMemo } from 'react'

interface MidiControllerProps {
  isConnected: boolean
  midiDevices: string[]
  onConnectMidi: () => void
}

// Constants moved outside component
const CONTAINER_STYLE = { marginBottom: '20px' } as const
const STATUS_CONTAINER_STYLE = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
} as const
const INDICATOR_BASE_STYLE = {
  width: '10px',
  height: '10px',
  borderRadius: '50%',
} as const
const BUTTON_STYLE = {
  marginTop: '10px',
  padding: '8px 16px',
  backgroundColor: '#4CAF50',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
} as const
const DEVICES_STYLE = { marginTop: '10px' } as const

const CONNECTED_COLOR = '#4CAF50'
const DISCONNECTED_COLOR = '#f44336'

const MidiController: React.FC<MidiControllerProps> = ({
  isConnected,
  midiDevices,
  onConnectMidi,
}) => {
  const indicatorStyle = useMemo(
    () => ({
      ...INDICATOR_BASE_STYLE,
      backgroundColor: isConnected ? CONNECTED_COLOR : DISCONNECTED_COLOR,
    }),
    [isConnected]
  )

  const statusText = useMemo(
    () => (isConnected ? 'Connected' : 'Disconnected'),
    [isConnected]
  )

  const devicesText = useMemo(
    () =>
      midiDevices.length > 0 ? `Devices: ${midiDevices.join(', ')}` : null,
    [midiDevices]
  )

  return (
    <div style={CONTAINER_STYLE}>
      <h3>MIDI Controller</h3>
      <div style={STATUS_CONTAINER_STYLE}>
        <div style={indicatorStyle} />
        <span>{statusText}</span>
      </div>

      {!isConnected && (
        <button onClick={onConnectMidi} style={BUTTON_STYLE}>
          Connect MIDI
        </button>
      )}

      {devicesText !== null && (
        <div style={DEVICES_STYLE}>
          <small>{devicesText}</small>
        </div>
      )}
    </div>
  )
}

export default MidiController
