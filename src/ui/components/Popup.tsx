import React from 'react'

import { useSoundTools } from '../hooks/useSoundTools'

import AudioEffects from './AudioEffect'
import Header from './Header'
import MidiController from './MidiController'

// Constants moved outside component
const CONTAINER_STYLE = { padding: '20px' } as const

const Popup: React.FC = () => {
  const {
    isConnected,
    midiDevices,
    enabledEffects,
    connectMidi,
    toggleEffect,
  } = useSoundTools()

  return (
    <div style={CONTAINER_STYLE}>
      <Header />
      <MidiController
        isConnected={isConnected}
        midiDevices={midiDevices}
        onConnectMidi={connectMidi}
      />
      <AudioEffects
        enabledEffects={enabledEffects}
        onToggleEffect={toggleEffect}
      />
    </div>
  )
}

export default Popup
