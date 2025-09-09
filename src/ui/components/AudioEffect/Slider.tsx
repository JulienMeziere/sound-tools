import React, { useCallback, useRef, useState, useEffect } from 'react'

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
}

// Constants moved outside component
const SLIDER_CONTAINER_STYLE = {
  padding: '10px',
  backgroundColor: 'rgba(255, 255, 255, 0.05)',
  borderRadius: '4px',
  border: '1px solid rgba(255, 255, 255, 0.1)',
} as const

const SLIDER_LABEL_STYLE = {
  fontSize: '12px',
  color: 'rgba(255, 255, 255, 0.8)',
  marginBottom: '5px',
  display: 'flex',
  justifyContent: 'space-between',
} as const

const SLIDER_TRACK_STYLE = {
  width: '100%',
  height: '20px',
  backgroundColor: 'rgba(255, 255, 255, 0.1)',
  borderRadius: '10px',
  position: 'relative' as const,
  cursor: 'pointer',
  border: '1px solid rgba(255, 255, 255, 0.2)',
}

const SLIDER_FILL_STYLE = {
  height: '100%',
  backgroundColor: '#4CAF50',
  borderRadius: '10px',
}

const SLIDER_THUMB_STYLE = {
  width: '16px',
  height: '16px',
  backgroundColor: 'white',
  borderRadius: '50%',
  position: 'absolute' as const,
  top: '2px',
  cursor: 'grab',
  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
}

const Slider: React.FC<SliderProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}) => {
  const trackRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const percentage = ((value - min) / (max - min)) * 100

  const updateValue = useCallback(
    (clientX: number) => {
      if (!trackRef.current) return

      const rect = trackRef.current.getBoundingClientRect()
      const clickX = clientX - rect.left
      const trackWidth = rect.width
      const newPercentage = Math.max(
        0,
        Math.min(100, (clickX / trackWidth) * 100)
      )
      const newValue = min + (newPercentage / 100) * (max - min)

      // Round to step
      const steppedValue = Math.round(newValue / step) * step
      const clampedValue = Math.max(min, Math.min(max, steppedValue))

      onChange(clampedValue)
    },
    [min, max, step, onChange]
  )

  const handleTrackClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (
        event.target === event.currentTarget ||
        (event.target as HTMLElement).className !== 'slider-thumb'
      ) {
        updateValue(event.clientX)
      }
    },
    [updateValue]
  )

  const handleMouseDown = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault()
      setIsDragging(true)
      updateValue(event.clientX)
    },
    [updateValue]
  )

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (isDragging) {
        updateValue(event.clientX)
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, updateValue])

  // Calculate thumb position (centered on the track)
  const thumbLeft = `calc(${percentage}% - 8px)`

  return (
    <div style={SLIDER_CONTAINER_STYLE}>
      <div style={SLIDER_LABEL_STYLE}>
        <span>{label}</span>
        <span>{value.toFixed(step < 1 ? 1 : 0)}</span>
      </div>
      <div
        ref={trackRef}
        style={SLIDER_TRACK_STYLE}
        onClick={handleTrackClick}
        onMouseDown={handleMouseDown}
      >
        <div
          style={{
            ...SLIDER_FILL_STYLE,
            width: `${percentage}%`,
          }}
        />
        <div
          className='slider-thumb'
          style={{
            ...SLIDER_THUMB_STYLE,
            left: thumbLeft,
            cursor: isDragging ? 'grabbing' : 'grab',
          }}
          onMouseDown={handleMouseDown}
        />
      </div>
    </div>
  )
}

export default Slider
