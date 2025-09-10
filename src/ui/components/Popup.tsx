import React from 'react';

import { useSoundTools } from '../hooks/useSoundTools';

import AudioEffects from './AudioEffect';
import Header from './Header';
import MidiController from './Midi';

// Constants moved outside component
const CONTAINER_STYLE = { padding: '20px' } as const;

const Popup: React.FC = () => {
  const { enabledEffects, toggleEffect, updateEffectParameter } =
    useSoundTools();

  return (
    <div style={CONTAINER_STYLE}>
      <Header />
      <MidiController onEffectToggle={toggleEffect} />
      <AudioEffects
        enabledEffects={enabledEffects}
        onToggleEffect={toggleEffect}
        onUpdateEffectParameter={updateEffectParameter}
      />
    </div>
  );
};

export default Popup;
