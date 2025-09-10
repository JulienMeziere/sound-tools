import React, { useCallback, useMemo } from 'react';
import { Logger } from '../../../logger';

interface MidiPermissionButtonProps {
  onRequestPermission: () => Promise<void>;
  isRequesting?: boolean;
}

const BUTTON_STYLE = {
  padding: '12px 24px',
  backgroundColor: '#6366f1',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: '500',
  transition: 'background-color 0.2s',
} as const;

const BUTTON_DISABLED_STYLE = {
  ...BUTTON_STYLE,
  backgroundColor: '#9ca3af',
  cursor: 'not-allowed',
} as const;

const CONTAINER_STYLE = {
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center',
  gap: '16px',
  padding: '24px',
  textAlign: 'center' as const,
};

const MidiPermissionButton: React.FC<MidiPermissionButtonProps> = ({
  onRequestPermission,
  isRequesting = false,
}) => {
  const handleClick = useCallback(async (): Promise<void> => {
    if (!isRequesting) {
      await onRequestPermission();
    }
  }, [isRequesting, onRequestPermission]);

  const handleClickWithErrorHandling = useCallback(() => {
    handleClick().catch(_error => {
      Logger.error('Permission request failed:', _error);
    });
  }, [handleClick]);

  const buttonStyle = useMemo(
    () => (isRequesting ? BUTTON_DISABLED_STYLE : BUTTON_STYLE),
    [isRequesting]
  );

  const buttonText = useMemo(
    () =>
      isRequesting ? 'Requesting Permission...' : 'Request MIDI Permission',
    [isRequesting]
  );

  return (
    <div style={CONTAINER_STYLE}>
      <h3>🎹 MIDI Controller</h3>
      <p>
        Connect MIDI devices to control audio effects with physical knobs and
        buttons.
      </p>
      <button
        onClick={handleClickWithErrorHandling}
        style={buttonStyle}
        disabled={isRequesting}
      >
        {buttonText}
      </button>
    </div>
  );
};

export default MidiPermissionButton;
