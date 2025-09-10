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
}) => {
  const [isSliderOpen, setIsSliderOpen] = useState(false);

  const toggleSlider = useCallback(() => {
    setIsSliderOpen((prev) => !prev);
  }, []);

  const handleParameterChange = useCallback(
    (parameterName: string, value: number) => {
      onParameterChange(effect.toLowerCase(), parameterName, value);
    },
    [effect, onParameterChange]
  );

  return (
    <div>
      <div style={ROW_STYLE}>
        <EffectButton
          effect={effect}
          isEnabled={isEnabled}
          onToggle={onToggle}
        />
        <SettingsButton isActive={isSliderOpen} onClick={toggleSlider} />
      </div>
      {isSliderOpen && (
        <div style={SLIDER_CONTAINER_STYLE}>
          {parameters.map((param) => (
            <Slider
              key={param.name}
              label={param.label}
              value={param.value}
              min={param.min || 0}
              max={param.max || 100}
              onChange={(value) => handleParameterChange(param.name, value)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default EffectRow;
