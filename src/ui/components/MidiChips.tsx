import React from 'react';

import { mappingKey, mappingLabel, type MidiMapping } from '../../shared/midi';
import { CloseIcon } from './Icons';

interface MidiChipsProps {
  mappings: MidiMapping[];
  onRemove: (mapping: MidiMapping) => void;
  className?: string;
}

/** Removable chips showing which MIDI controls are linked to an element. */
const MidiChips: React.FC<MidiChipsProps> = ({
  mappings,
  onRemove,
  className,
}) => {
  if (mappings.length === 0) return null;
  return (
    <div className={`midi-chips${className ? ` ${className}` : ''}`}>
      {mappings.map((mapping) => (
        <span key={mappingKey(mapping)} className='midi-chip'>
          {mappingLabel(mapping)}
          <button
            type='button'
            title='Remove MIDI link'
            aria-label={`Remove MIDI link ${mappingLabel(mapping)}`}
            onClick={(event) => {
              event.stopPropagation(); // don't trigger a learn-mode link
              onRemove(mapping);
            }}
          >
            <CloseIcon />
          </button>
        </span>
      ))}
    </div>
  );
};

export default MidiChips;
