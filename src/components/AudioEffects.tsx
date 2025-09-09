import React, { useMemo } from 'react'

import EffectButton from './EffectButton'

interface AudioEffectsProps {
  enabledEffects: Set<string>
  onToggleEffect: (effect: string) => void
}

// Constants moved outside component
const EFFECTS = ['Reverb', 'Distortion', 'Filter'] as const
const GRID_STYLE = { display: 'grid', gap: '10px' } as const

const AudioEffects: React.FC<AudioEffectsProps> = ({
  enabledEffects,
  onToggleEffect,
}) => {
  const effectButtons = useMemo(
    () =>
      EFFECTS.map(effect => {
        const effectLower = effect.toLowerCase()
        const isEnabled = enabledEffects.has(effectLower)

        return (
          <EffectButton
            key={effect}
            effect={effect}
            isEnabled={isEnabled}
            onToggle={onToggleEffect}
          />
        )
      }),
    [enabledEffects, onToggleEffect]
  )

  return (
    <div>
      <h3>Audio Effects</h3>
      <div style={GRID_STYLE}>{effectButtons}</div>
    </div>
  )
}

export default AudioEffects
