import React from 'react';

interface SettingsButtonProps {
  isActive: boolean;
  onClick: () => void;
}

// Constants moved outside component
const SETTINGS_BUTTON_STYLE = {
  width: '32px',
  height: '32px',
  borderRadius: '4px',
  border: '1px solid rgba(255, 255, 255, 0.3)',
  borderColor: 'rgba(255, 255, 255, 0.3)',
  backgroundColor: 'rgba(255, 255, 255, 0.1)',
  color: 'white',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '14px',
  transition: 'all 0.2s',
  outline: 'none',
} as const;

const SETTINGS_BUTTON_ACTIVE_STYLE = {
  ...SETTINGS_BUTTON_STYLE,
  backgroundColor: '#4CAF50',
  borderColor: '#4CAF50',
  outline: 'none',
  boxShadow: '0 0 8px rgba(76, 175, 80, 0.4)',
} as const;

const SettingsButton: React.FC<SettingsButtonProps> = ({
  isActive,
  onClick,
}) => (
  <button
    style={isActive ? SETTINGS_BUTTON_ACTIVE_STYLE : SETTINGS_BUTTON_STYLE}
    onMouseOver={e => {
      if (!isActive) {
        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
      }
    }}
    onMouseOut={e => {
      if (!isActive) {
        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
      }
    }}
    onClick={onClick}
  >
    ⚙️
  </button>
);

export default SettingsButton;
