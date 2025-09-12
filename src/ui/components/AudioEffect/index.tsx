import React, { useMemo, useState, useCallback, useEffect } from 'react';

import EffectRow from './EffectRow';
import { popupParameterStore } from '../../../ParameterStore/PopupParameterStore';

interface AudioEffectsProps {
  enabledEffects: Set<string>;
  onToggleEffect: (effect: string) => void;
  onUpdateEffectParameter: (
    effect: string,
    parameter: string,
    value: number
  ) => void;
  isLearning: boolean;
  onRequestMidiLink: (targetId: string) => void;
}

// Grid style constant
const GRID_STYLE = { display: 'grid', gap: '10px' } as const;

const AudioEffects: React.FC<AudioEffectsProps> = ({
  enabledEffects,
  onToggleEffect,
  onUpdateEffectParameter,
  isLearning,
  onRequestMidiLink,
}) => {
  const [sliderValues, setSliderValues] = useState<
    Record<string, Record<string, number>>
  >({});
  const [isStoreInitialized, setIsStoreInitialized] = useState(false);

  // Initialize parameter store and sync with UI
  useEffect(() => {
    const initializeStore = async () => {
      await popupParameterStore.initialize();

      // Get current parameters from store
      const currentParams = popupParameterStore.getAllParametersAsObject();
      setSliderValues(currentParams);
      setIsStoreInitialized(true);

      // Listen for parameter updates
      const handleUIUpdate = () => {
        const updatedParams = popupParameterStore.getAllParametersAsObject();
        setSliderValues(updatedParams);
      };

      popupParameterStore.addUIUpdateListener(handleUIUpdate);

      // Cleanup listener on unmount
      return () => {
        popupParameterStore.removeUIUpdateListener(handleUIUpdate);
      };
    };

    void initializeStore();
  }, []);

  const handleParameterChange = useCallback(
    (effect: string, parameter: string, value: number) => {
      // Update via parameter store (this will handle persistence and content script communication)
      void popupParameterStore.setParameter(effect, parameter, value);
      onUpdateEffectParameter(effect, parameter, value);
    },
    [onUpdateEffectParameter]
  );

  // Get parameters for each effect from parameter store definitions
  const getEffectParameters = useCallback(
    (effect: string) => {
      const effectLower = effect.toLowerCase();
      const effectValues = sliderValues[effectLower] || {};

      // Get effect definition from parameter store
      const effectDefinition =
        popupParameterStore.getEffectDefinition(effectLower);
      if (!effectDefinition) {
        return [];
      }

      // Map parameter definitions to UI format
      return effectDefinition.parameters.map((paramDef) => ({
        name: paramDef.name,
        label: paramDef.label,
        value: effectValues[paramDef.name] ?? paramDef.defaultValue,
        min: paramDef.min,
        max: paramDef.max,
        step: paramDef.step,
        unit: paramDef.unit,
      }));
    },
    [sliderValues]
  );

  const effectRows = useMemo(() => {
    if (!isStoreInitialized) {
      return null; // Don't render until store is initialized
    }

    // Get effects from parameter store definitions
    const effectDefinitions = popupParameterStore.getAllEffectDefinitions();

    return effectDefinitions.map((effectDef) => {
      const effectLower = effectDef.name.toLowerCase();
      const isEnabled = enabledEffects.has(effectLower);
      const parameters = getEffectParameters(effectDef.name);

      return (
        <EffectRow
          key={effectDef.name}
          effect={effectDef.label}
          isEnabled={isEnabled}
          onToggle={onToggleEffect}
          parameters={parameters}
          onParameterChange={handleParameterChange}
          isLearning={isLearning}
          onRequestMidiLink={onRequestMidiLink}
        />
      );
    });
  }, [
    isStoreInitialized,
    enabledEffects,
    onToggleEffect,
    getEffectParameters,
    handleParameterChange,
    isLearning,
    onRequestMidiLink,
  ]);

  return (
    <div>
      <h3>Audio Effects</h3>
      <div style={GRID_STYLE}>{effectRows}</div>
    </div>
  );
};

export default AudioEffects;
