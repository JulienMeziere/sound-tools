import React, { useCallback, useState } from 'react';

import EffectButton from './EffectButton';
import SettingsButton from './SettingsButton';
import Slider from './Slider';

interface EffectParameter {
  name: string;
  label: string;
  value: number;
  min?: number;
  max?: number;
}

interface EffectRowProps {
  effect: string;
  isEnabled: boolean;
  onToggle: (effect: string) => void;
  parameters: EffectParameter[];
  onParameterChange: (effect: string, parameter: string, value: number) => void;
  isLearning: boolean;
  onRequestMidiLink: (targetId: string) => void;
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
}) => {
  const [isSliderOpen, setIsSliderOpen] = useState(false);

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
      {shouldShowSliders && (
        <div
          style={SLIDER_CONTAINER_STYLE}
          className={isLearning ? 'sound-tools-learn-mode' : ''}
        >
          {parameters.map((param) => (
            <Slider
              key={param.name}
              label={param.label}
              value={param.value}
              min={param.min || 0}
              max={param.max || 100}
              onChange={(value) => handleParameterChange(param.name, value)}
              onMidiLinkRequest={() => handleSliderClick(param.name)}
              isLearning={isLearning}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default EffectRow;
