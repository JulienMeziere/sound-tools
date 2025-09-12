import React, { useCallback, useState, useEffect } from 'react';

import EffectButton from './EffectButton';
import SettingsButton from './SettingsButton';
import Slider from './Slider';
import MidiLinkChip from './MidiLinkChip';
import { Logger } from '../../../logger';

interface EffectParameter {
  name: string;
  label: string;
  value: number;
  min?: number;
  max?: number;
}

interface MidiMapping {
  id: string;
  type: 'effect-toggle' | 'effect-parameter';
  effect: string;
  parameter?: string;
  midiType: 'note' | 'control';
  midiChannel: number;
  midiNote?: number;
  midiCC?: number;
}

interface EffectRowProps {
  effect: string;
  isEnabled: boolean;
  onToggle: (effect: string) => void;
  parameters: EffectParameter[];
  onParameterChange: (effect: string, parameter: string, value: number) => void;
  isLearning: boolean;
  onRequestMidiLink: (targetId: string) => void;
  getMidiMappings: () => Promise<MidiMapping[]>;
  removeSpecificMidiLink: (
    midiType: 'note' | 'control',
    midiChannel: number,
    midiValue: number
  ) => Promise<boolean>;
  isLinked: boolean;
}

// Constants moved outside component
const ROW_STYLE = {
  display: 'flex',
  gap: '8px',
  alignItems: 'center',
  width: '100%',
} as const;

const SLIDER_CONTAINER_STYLE = {
  marginTop: '8px',
} as const;

const EffectRow: React.FC<EffectRowProps> = ({
  effect,
  isEnabled,
  onToggle,
  parameters,
  onParameterChange,
  isLearning,
  onRequestMidiLink,
  getMidiMappings,
  removeSpecificMidiLink,
  isLinked,
}) => {
  const [isSliderOpen, setIsSliderOpen] = useState(false);
  const [midiMappings, setMidiMappings] = useState<MidiMapping[]>([]);
  const [mappingsVersion, setMappingsVersion] = useState(0);

  // Load MIDI mappings when component mounts or when MIDI state changes
  useEffect(() => {
    const loadMappings = async () => {
      const mappings = await getMidiMappings();
      setMidiMappings(mappings);
    };
    void loadMappings();
  }, [getMidiMappings, isLinked, mappingsVersion]);

  // Listen for MIDI mappings updates
  useEffect(() => {
    const messageListener = (
      message: { type?: string; data?: unknown },
      sender: chrome.runtime.MessageSender
    ) => {
      // Only process messages from content scripts
      if (sender.tab && message.type === 'midiMappingsUpdate') {
        const update = message.data as { mappings?: MidiMapping[] };
        if (Array.isArray(update.mappings)) {
          setMidiMappings(update.mappings);
          setMappingsVersion((prev) => prev + 1);
        }
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);

    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, []);

  // Auto-expand sliders when in learning mode
  const shouldShowSliders = isSliderOpen || isLearning;

  const toggleSlider = useCallback(() => {
    setIsSliderOpen((prev) => !prev);
  }, []);

  const handleParameterChange = useCallback(
    (parameterName: string, value: number) => {
      onParameterChange(effect.toLowerCase(), parameterName, value);
    },
    [effect, onParameterChange]
  );

  const handleEffectButtonClick = useCallback(() => {
    const targetId = `effect-toggle-${effect.toLowerCase()}`;
    onRequestMidiLink(targetId);
  }, [effect, onRequestMidiLink]);

  const handleSliderClick = useCallback(
    (parameterName: string) => {
      const targetId = `effect-parameter-${effect.toLowerCase()}-${parameterName}`;
      onRequestMidiLink(targetId);
    },
    [effect, onRequestMidiLink]
  );

  // Helper function to get all mappings for effect button
  const getEffectButtonMappings = useCallback(() => {
    const targetId = `effect-toggle-${effect.toLowerCase()}`;
    return midiMappings.filter((mapping) => mapping.id === targetId);
  }, [midiMappings, effect]);

  // Helper function to get all mappings for parameter
  const getParameterMappings = useCallback(
    (parameterName: string) => {
      const targetId = `effect-parameter-${effect.toLowerCase()}-${parameterName}`;
      return midiMappings.filter((mapping) => mapping.id === targetId);
    },
    [midiMappings, effect]
  );

  // Handle removing specific MIDI link
  const handleRemoveSpecificMidiLink = useCallback(
    async (mapping: MidiMapping) => {
      const midiValue = mapping.midiNote || mapping.midiCC;
      if (midiValue === undefined) {
        Logger.error('Invalid MIDI mapping: no note or CC value');
        return;
      }

      const success = await removeSpecificMidiLink(
        mapping.midiType,
        mapping.midiChannel,
        midiValue
      );
      if (success) {
        // Reload mappings after successful removal
        const mappings = await getMidiMappings();
        setMidiMappings(mappings);
      }
    },
    [removeSpecificMidiLink, getMidiMappings]
  );

  return (
    <div>
      <div style={ROW_STYLE}>
        <EffectButton
          effect={effect}
          isEnabled={isEnabled}
          onToggle={onToggle}
          isLearning={isLearning}
          onMidiLinkRequest={handleEffectButtonClick}
        />
        <SettingsButton isActive={shouldShowSliders} onClick={toggleSlider} />
      </div>

      {/* MIDI chips for effect button */}
      {getEffectButtonMappings().map((mapping) => (
        <MidiLinkChip
          key={`${mapping.id}-${mapping.midiType}-${mapping.midiChannel}-${mapping.midiNote || mapping.midiCC}`}
          midiType={mapping.midiType}
          midiNote={mapping.midiNote}
          midiCC={mapping.midiCC}
          onRemove={() => void handleRemoveSpecificMidiLink(mapping)}
        />
      ))}
      {shouldShowSliders && (
        <div
          style={SLIDER_CONTAINER_STYLE}
          className={isLearning ? 'sound-tools-learn-mode' : ''}
        >
          {parameters.map((param) => (
            <div key={param.name}>
              <Slider
                label={param.label}
                value={param.value}
                min={param.min || 0}
                max={param.max || 100}
                onChange={(value) => handleParameterChange(param.name, value)}
                onMidiLinkRequest={() => handleSliderClick(param.name)}
                isLearning={isLearning}
              />
              {/* MIDI chips for parameter */}
              {getParameterMappings(param.name).map((mapping) => (
                <MidiLinkChip
                  key={`${mapping.id}-${mapping.midiType}-${mapping.midiChannel}-${mapping.midiNote || mapping.midiCC}`}
                  midiType={mapping.midiType}
                  midiNote={mapping.midiNote}
                  midiCC={mapping.midiCC}
                  onRemove={() => void handleRemoveSpecificMidiLink(mapping)}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EffectRow;
