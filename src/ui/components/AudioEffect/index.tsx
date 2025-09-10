import React, { useMemo, useState, useCallback } from 'react';

import EffectRow from './EffectRow';

interface AudioEffectsProps {
  enabledEffects: Set<string>;
  onToggleEffect: (effect: string) => void;
  onUpdateEffectParameter: (
    effect: string,
    parameter: string,
    value: number
  ) => void;
}

// Constants moved outside component - Order: Distortion > Reverb > Filter
const EFFECTS = ['Distortion', 'Reverb', 'Filter'] as const;
const GRID_STYLE = { display: 'grid', gap: '10px' } as const;

const AudioEffects: React.FC<AudioEffectsProps> = ({
  enabledEffects,
  onToggleEffect,
  onUpdateEffectParameter,
}) => {
  const [sliderValues, setSliderValues] = useState<
    Record<string, Record<string, number>>
  >({
    distortion: {
      amount: 30,
    },
    reverb: {
      roomSize: 50,
      mix: 30, // Mix default
    },
    filter: {
      highPassFreq: 20, // High-pass frequency default
      highPassQ: 10, // High-pass Q default
      lowPassFreq: 80, // Low-pass frequency default
      lowPassQ: 10, // Low-pass Q default
    },
  });

  const handleParameterChange = useCallback(
    (effect: string, parameter: string, value: number) => {
      setSliderValues((prev) => ({
        ...prev,
        [effect]: {
          ...prev[effect],
          [parameter]: value,
        },
      }));

      onUpdateEffectParameter(effect, parameter, value);
    },
    [onUpdateEffectParameter]
  );

  // Define parameters for each effect
  const getEffectParameters = useCallback(
    (effect: string) => {
      const effectLower = effect.toLowerCase();
      const effectValues = sliderValues[effectLower] || {};

      switch (effectLower) {
        case 'distortion':
          return [
            {
              name: 'amount',
              label: 'Distortion Amount',
              value: effectValues['amount'] || 30,
            },
          ];
        case 'reverb':
          return [
            {
              name: 'roomSize',
              label: 'Room Size',
              value: effectValues['roomSize'] || 50,
            },
            {
              name: 'mix',
              label: 'Reverb Mix',
              value: effectValues['mix'] || 30,
            },
          ];
        case 'filter':
          return [
            {
              name: 'highPassFreq',
              label: 'High-Pass Frequency',
              value: effectValues['highPassFreq'] || 20,
            },
            {
              name: 'highPassQ',
              label: 'High-Pass Resonance (Q)',
              value: effectValues['highPassQ'] || 10,
            },
            {
              name: 'lowPassFreq',
              label: 'Low-Pass Frequency',
              value: effectValues['lowPassFreq'] || 80,
            },
            {
              name: 'lowPassQ',
              label: 'Low-Pass Resonance (Q)',
              value: effectValues['lowPassQ'] || 10,
            },
          ];
        default:
          return [];
      }
    },
    [sliderValues]
  );

  const effectRows = useMemo(
    () =>
      EFFECTS.map((effect) => {
        const effectLower = effect.toLowerCase();
        const isEnabled = enabledEffects.has(effectLower);
        const parameters = getEffectParameters(effect);

        return (
          <EffectRow
            key={effect}
            effect={effect}
            isEnabled={isEnabled}
            onToggle={onToggleEffect}
            parameters={parameters}
            onParameterChange={handleParameterChange}
          />
        );
      }),
    [enabledEffects, onToggleEffect, getEffectParameters, handleParameterChange]
  );

  return (
    <div>
      <h3>Audio Effects</h3>
      <div style={GRID_STYLE}>{effectRows}</div>
    </div>
  );
};

export default AudioEffects;
