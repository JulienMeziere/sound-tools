import React from 'react';

interface SwitchProps {
  checked: boolean;
  label: string;
  /** Highlights the switch as a MIDI learn target. */
  learnTarget?: boolean;
  onClick: () => void;
}

const Switch: React.FC<SwitchProps> = ({
  checked,
  label,
  learnTarget = false,
  onClick,
}) => (
  <button
    type='button'
    role='switch'
    aria-checked={checked}
    aria-label={label}
    title={learnTarget ? `Link to ${label} on/off` : label}
    className={`switch${learnTarget ? ' learn-target' : ''}`}
    onClick={onClick}
  >
    <span className='switch-thumb' />
  </button>
);

export default Switch;
