import React from 'react';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  /** False when the effect is off: the fill is shown in a neutral color. */
  active: boolean;
  onChange: (value: number) => void;
  /** In MIDI learn mode, clicking the slider links it instead of moving it. */
  onLearnClick?: (() => void) | undefined;
  /** Shown under the slider (MIDI link chips). */
  children?: React.ReactNode;
}

const Slider: React.FC<SliderProps> = ({
  label,
  value,
  min,
  max,
  active,
  onChange,
  onLearnClick,
  children,
}) => {
  // Unitless 0–1 ratio: the CSS turns it into the thumb's center position.
  const fill = String((value - min) / (max - min));

  return (
    <div
      className={[
        'slider',
        active && 'is-active',
        onLearnClick && 'learn-target',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={onLearnClick}
    >
      <div className='slider-label'>
        <span>{label}</span>
        <span className='slider-value'>{Math.round(value)}</span>
      </div>
      <input
        type='range'
        aria-label={label}
        min={min}
        max={max}
        step='any'
        value={value}
        style={{ '--fill': fill } as React.CSSProperties}
        tabIndex={onLearnClick ? -1 : 0}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      {children}
    </div>
  );
};

export default Slider;
