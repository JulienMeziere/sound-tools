import React, { useCallback, useMemo } from 'react';

interface MidiButtonProps {
  label: string;
  isConnected: boolean;
  onClick: () => void;
  disabled?: boolean;
}

// Constants moved outside component - matching EffectButton styling
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

const CONNECTED_BG = 'rgba(76, 175, 80, 0.8)';
const DISCONNECTED_BG = 'rgba(255, 255, 255, 0.2)';
const DISABLED_BG = 'rgba(255, 255, 255, 0.1)';
const HOVER_BG = 'rgba(255, 255, 255, 0.3)';
const CONNECTED_BORDER_COLOR = '#4CAF50';
const DISCONNECTED_BORDER_COLOR = 'rgba(255, 255, 255, 0.3)';
const DISABLED_BORDER_COLOR = 'rgba(255, 255, 255, 0.2)';

const MidiButton: React.FC<MidiButtonProps> = ({
  label,
  isConnected,
  onClick,
  disabled = false,
}) => {
  const handleClick = useCallback(() => {
    if (!disabled) {
      onClick();
    }
  }, [disabled, onClick]);

  const handleMouseOver = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!disabled && !isConnected) {
        e.currentTarget.style.backgroundColor = HOVER_BG;
      }
    },
    [disabled, isConnected]
  );

  const handleMouseOut = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!disabled && !isConnected) {
        e.currentTarget.style.backgroundColor = DISCONNECTED_BG;
      }
    },
    [disabled, isConnected]
  );

  const buttonStyle = useMemo(() => {
    if (disabled) {
      return {
        ...BASE_BUTTON_STYLE,
        backgroundColor: DISABLED_BG,
        borderColor: DISABLED_BORDER_COLOR,
        cursor: 'not-allowed',
        opacity: 0.6,
      };
    }

    return {
      ...BASE_BUTTON_STYLE,
      backgroundColor: isConnected ? CONNECTED_BG : DISCONNECTED_BG,
      borderColor: isConnected
        ? CONNECTED_BORDER_COLOR
        : DISCONNECTED_BORDER_COLOR,
      fontWeight: isConnected ? '600' : 'normal',
    };
  }, [disabled, isConnected]);

  const getStatusText = useMemo(() => {
    if (disabled) return 'DISABLED';
    return isConnected ? 'CONNECTED' : 'DISCONNECTED';
  }, [disabled, isConnected]);

  return (
    <button
      onClick={handleClick}
      style={buttonStyle}
      onMouseOver={handleMouseOver}
      onMouseOut={handleMouseOut}
      disabled={disabled}
    >
      <span>{label}</span>
      <span style={STATUS_STYLE}>{getStatusText}</span>
    </button>
  );
};

export default MidiButton;
