import React, { useState } from 'react';

import type { EffectDefinition, EffectName } from '../../shared/effects';
import { targetId, type MidiMapping, type MidiTarget } from '../../shared/midi';
import { ChevronIcon, EFFECT_ICONS } from './Icons';
import MidiChips from './MidiChips';
import Slider from './Slider';
import Switch from './Switch';

const DESCRIPTIONS: Record<EffectName, string> = {
  distortion: 'Saturation and grit',
  reverb: 'Room ambience',
  filter: 'High-pass and low-pass',
};

interface EffectCardProps {
  effect: EffectDefinition;
  enabled: boolean;
  values: Record<string, number>;
  mappings: MidiMapping[];
  /** MIDI learn mode with a control ready to be linked. */
  isLinking: boolean;
  onToggle: () => void;
  onParameterChange: (parameter: string, value: number) => void;
  onLink: (target: MidiTarget) => void;
  onUnlink: (mapping: MidiMapping) => void;
}

const EffectCard: React.FC<EffectCardProps> = ({
  effect,
  enabled,
  values,
  mappings,
  isLinking,
  onToggle,
  onParameterChange,
  onLink,
  onUnlink,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  // In learn mode every slider must be reachable.
  const isExpanded = isOpen || isLinking;
  const Icon = EFFECT_ICONS[effect.name];
  const bodyId = `effect-${effect.name}-settings`;

  const toggleTarget: MidiTarget = {
    type: 'effect-toggle',
    effect: effect.name,
  };
  const mappingsFor = (target: MidiTarget): MidiMapping[] =>
    mappings.filter((mapping) => mapping.id === targetId(target));

  return (
    <div className={`card${enabled ? ' is-on' : ''}`}>
      <div className='card-header'>
        <button
          type='button'
          className='card-toggle'
          aria-expanded={isExpanded}
          aria-controls={bodyId}
          aria-label={`${effect.label} settings`}
          onClick={() => setIsOpen((open) => !open)}
        >
          <span className='card-icon'>
            <Icon />
          </span>
          <span className='card-titles'>
            <span className='card-title'>{effect.label}</span>
            <span className='card-subtitle'>{DESCRIPTIONS[effect.name]}</span>
          </span>
          <ChevronIcon className='chevron' />
        </button>
        <Switch
          checked={enabled}
          label={effect.label}
          learnTarget={isLinking}
          onClick={isLinking ? () => onLink(toggleTarget) : onToggle}
        />
      </div>

      <MidiChips
        className='card-chips'
        mappings={mappingsFor(toggleTarget)}
        onRemove={onUnlink}
      />

      {isExpanded && (
        <div className='card-body' id={bodyId}>
          {effect.parameters.map((param) => {
            const target: MidiTarget = {
              type: 'effect-parameter',
              effect: effect.name,
              parameter: param.name,
            };
            return (
              <Slider
                key={param.name}
                label={param.label}
                value={values[param.name] ?? param.defaultValue}
                min={param.min}
                max={param.max}
                active={enabled}
                onChange={(value) => onParameterChange(param.name, value)}
                onLearnClick={
                  isLinking
                    ? () => {
                        // Keep the card open so the new link chip stays visible.
                        setIsOpen(true);
                        onLink(target);
                      }
                    : undefined
                }
              >
                <MidiChips mappings={mappingsFor(target)} onRemove={onUnlink} />
              </Slider>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EffectCard;
