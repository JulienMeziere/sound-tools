import React from 'react';

import { useSoundTools } from '../hooks/useSoundTools';
import { useMidiController } from '../hooks/useMidiController';

import AudioEffects from './AudioEffect';
import Header from './Header';
import MidiController from './Midi';

// Constants moved outside component
const CONTAINER_STYLE = { padding: '20px' } as const;

const Popup: React.FC = () => {
  const { enabledEffects, toggleEffect, updateEffectParameter } =
    useSoundTools();
  const midiController = useMidiController();
  const { isLearning, isPreLearning, requestMidiLink } = midiController;

  return (
    <div style={CONTAINER_STYLE}>
      <Header />
      <MidiController
        onEffectToggle={toggleEffect}
        midiController={midiController}
      />
      <AudioEffects
        enabledEffects={enabledEffects}
        onToggleEffect={toggleEffect}
        onUpdateEffectParameter={updateEffectParameter}
        isLearning={isLearning && !isPreLearning}
        onRequestMidiLink={requestMidiLink}
      />
    </div>
  );
};

export default Popup;
