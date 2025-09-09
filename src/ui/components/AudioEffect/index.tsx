import React, { useMemo, useState, useCallback } from 'react'

import EffectRow from './EffectRow'

interface AudioEffectsProps {
  enabledEffects: Set<string>
  onToggleEffect: (effect: string) => void
}

// Constants moved outside component - Order: Distortion > Reverb > Filter
const EFFECTS = ['Distortion', 'Reverb', 'Filter'] as const
const GRID_STYLE = { display: 'grid', gap: '10px' } as const

const AudioEffects: React.FC<AudioEffectsProps> = ({
  enabledEffects,
  onToggleEffect,
}) => {
  const [sliderValues, setSliderValues] = useState<Record<string, number>>({
    reverb: 50,
    distortion: 30,
    filter: 70,
  })

  const handleSliderChange = useCallback((effect: string, value: number) => {
    setSliderValues(prev => ({
      ...prev,
      [effect]: value,
    }))
    // Effect parameter changes will be implemented later
  }, [])
  const effectRows = useMemo(
    () =>
      EFFECTS.map(effect => {
        const effectLower = effect.toLowerCase()
        const isEnabled = enabledEffects.has(effectLower)

        return (
          <EffectRow
            key={effect}
            effect={effect}
            isEnabled={isEnabled}
            onToggle={onToggleEffect}
            sliderValue={sliderValues[effectLower] || 50}
            onSliderChange={handleSliderChange}
          />
        )
      }),
    [enabledEffects, onToggleEffect, sliderValues, handleSliderChange]
  )

  return (
    <div>
      <h3>Audio Effects</h3>
      <div style={GRID_STYLE}>{effectRows}</div>
    </div>
  )
}

export default AudioEffects
