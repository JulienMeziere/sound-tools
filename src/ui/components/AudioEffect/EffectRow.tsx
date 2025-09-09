import React, { useCallback, useState } from 'react'

import EffectButton from './EffectButton'
import SettingsButton from './SettingsButton'
import Slider from './Slider'

interface EffectRowProps {
  effect: string
  isEnabled: boolean
  onToggle: (effect: string) => void
  sliderValue: number
  onSliderChange: (effect: string, value: number) => void
}

// Constants moved outside component
const ROW_STYLE = {
  display: 'flex',
  gap: '8px',
  alignItems: 'center',
  width: '100%',
} as const

const SLIDER_CONTAINER_STYLE = {
  marginTop: '8px',
} as const

const EffectRow: React.FC<EffectRowProps> = ({
  effect,
  isEnabled,
  onToggle,
  sliderValue,
  onSliderChange,
}) => {
  const [isSliderOpen, setIsSliderOpen] = useState(false)
  const effectLower = effect.toLowerCase()

  const toggleSlider = useCallback(() => {
    setIsSliderOpen(prev => !prev)
  }, [])

  const handleSliderChange = useCallback(
    (value: number) => {
      onSliderChange(effectLower, value)
    },
    [effectLower, onSliderChange]
  )

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
          <Slider
            label={`${effect} Level`}
            value={sliderValue}
            min={0}
            max={100}
            onChange={handleSliderChange}
          />
        </div>
      )}
    </div>
  )
}

export default EffectRow
