import React, { useCallback, useMemo } from 'react';

interface EffectButtonProps {
  effect: string;
  isEnabled: boolean;
  onToggle: (effect: string) => void;
  isLearning: boolean;
  onMidiLinkRequest: () => void;
}

// Constants moved outside component
const BASE_BUTTON_STYLE = {
  padding: '10px',
  color: 'white',
  borderRadius: '4px',
  cursor: 'pointer',
  transition: 'all 0.2s',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  boxSizing: 'border-box' as const,
  borderWidth: '2px',
  borderStyle: 'solid',
  flex: 1,
} as const;

const STATUS_STYLE = { fontSize: '12px', opacity: 0.8 } as const;

const ENABLED_BG = 'rgba(76, 175, 80, 0.8)';
const DISABLED_BG = 'rgba(255, 255, 255, 0.2)';
const HOVER_BG = 'rgba(255, 255, 255, 0.3)';
const ENABLED_BORDER_COLOR = '#4CAF50';
const DISABLED_BORDER_COLOR = 'rgba(255, 255, 255, 0.3)';

const EffectButton: React.FC<EffectButtonProps> = ({
  effect,
  isEnabled,
  onToggle,
  isLearning,
  onMidiLinkRequest,
}) => {
  const handleClick = useCallback(() => {
    if (isLearning) {
      // In learn mode, request MIDI link instead of toggling
      onMidiLinkRequest();
    } else {
      // Normal mode, toggle the effect
      onToggle(effect);
    }
  }, [effect, onToggle, isLearning, onMidiLinkRequest]);

  const handleMouseOver = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!isEnabled) {
        e.currentTarget.style.backgroundColor = HOVER_BG;
      }
    },
    [isEnabled]
  );

  const handleMouseOut = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!isEnabled) {
        e.currentTarget.style.backgroundColor = DISABLED_BG;
      }
    },
    [isEnabled]
  );

  const buttonStyle = useMemo(
    () => ({
      ...BASE_BUTTON_STYLE,
      backgroundColor: isEnabled ? ENABLED_BG : DISABLED_BG,
      borderColor: isEnabled ? ENABLED_BORDER_COLOR : DISABLED_BORDER_COLOR,
      fontWeight: isEnabled ? '600' : 'normal',
    }),
    [isEnabled]
  );

  return (
    <button
      onClick={handleClick}
      style={buttonStyle}
      className={isLearning ? 'sound-tools-learn-mode' : ''}
      onMouseOver={handleMouseOver}
      onMouseOut={handleMouseOut}
    >
      <span>{effect}</span>
      <span style={STATUS_STYLE}>{isEnabled ? 'ON' : 'OFF'}</span>
    </button>
  );
};

export default EffectButton;
