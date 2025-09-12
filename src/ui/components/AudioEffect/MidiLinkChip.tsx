import React, { useCallback } from 'react';

interface MidiLinkChipProps {
  midiType: 'note' | 'control';
  midiNote?: number | undefined;
  midiCC?: number | undefined;
  onRemove: () => void;
}

// Constants for styling
const CHIP_STYLE = {
  display: 'inline-flex',
  alignItems: 'center',
  backgroundColor: 'rgba(76, 175, 80, 0.8)',
  color: 'white',
  fontSize: '10px',
  padding: '2px 6px',
  borderRadius: '12px',
  marginTop: '4px',
  marginRight: '4px',
  border: '1px solid rgba(76, 175, 80, 1)',
  cursor: 'default',
} as const;

const REMOVE_BUTTON_STYLE = {
  marginLeft: '4px',
  backgroundColor: 'transparent',
  border: 'none',
  color: 'white',
  cursor: 'pointer',
  fontSize: '10px',
  padding: '0',
  width: '12px',
  height: '12px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background-color 0.2s',
} as const;

const MidiLinkChip: React.FC<MidiLinkChipProps> = ({
  midiType,
  midiNote,
  midiCC,
  onRemove,
}) => {
  const handleRemove = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onRemove();
    },
    [onRemove]
  );

  // Format the MIDI info for display
  const midiInfo = midiType === 'note' ? `Note ${midiNote}` : `CC${midiCC}`;

  return (
    <div style={CHIP_STYLE}>
      <span>🎹 {midiInfo}</span>
      <button
        style={REMOVE_BUTTON_STYLE}
        onClick={handleRemove}
        onMouseOver={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
        title='Remove MIDI link'
      >
        ×
      </button>
    </div>
  );
};

export default MidiLinkChip;
