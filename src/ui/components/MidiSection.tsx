import React, { useState } from 'react';

import type { MidiStatus } from '../../shared/midi';
import type { TabActions } from '../useTabState';
import { ChevronIcon, MidiIcon } from './Icons';

interface MidiSectionProps {
  midi: MidiStatus;
  actions: TabActions;
}

const MidiSection: React.FC<MidiSectionProps> = ({ midi, actions }) => {
  // null: not chosen by the user yet (open while there is a device to pick).
  const [isOpen, setIsOpen] = useState<boolean | null>(null);
  // What is currently awaiting a content script answer.
  const [pending, setPending] = useState<string | null>(null);

  const run = async (key: string, action: () => Promise<void>) => {
    setPending(key);
    try {
      await action();
    } finally {
      setPending(null);
    }
  };

  const device = midi.connectedDevice;

  if (!midi.hasPermission) {
    return (
      <div className='card'>
        <div className='card-header card-header-static'>
          <span className='card-icon'>
            <MidiIcon />
          </span>
          <span className='card-titles'>
            <span className='card-title'>MIDI controller</span>
            <span className='card-subtitle'>
              Drive effects with knobs and pads
            </span>
          </span>
          <button
            type='button'
            className='button button-primary'
            disabled={pending !== null}
            onClick={() =>
              void run('permission', actions.requestMidiPermission)
            }
          >
            {pending ? 'Waiting…' : 'Enable'}
          </button>
        </div>
      </div>
    );
  }

  const isExpanded = isOpen ?? (!device || midi.isLearning);
  const status = device ? 'Connected' : 'Not connected';

  const renderBody = () => {
    if (device) {
      const { lastActivity } = midi;
      return (
        <>
          <div className='button-group'>
            <button
              type='button'
              className={`button button-primary${midi.isLearning ? ' is-active' : ''}`}
              aria-pressed={midi.isLearning}
              onClick={() => void actions.setMidiLearning(!midi.isLearning)}
            >
              {midi.isLearning ? 'Stop learning' : 'Learn'}
            </button>
            <button
              type='button'
              className='button button-ghost'
              onClick={() => void actions.disconnectMidi()}
            >
              Disconnect
            </button>
          </div>
          {midi.isLearning && (
            <div className='learn-box' aria-live='polite'>
              {lastActivity ? (
                <>
                  <span className={`learn-tag learn-tag-${lastActivity.type}`}>
                    {lastActivity.message}
                  </span>
                  <span>
                    Channel {lastActivity.channel} · now click a switch or a
                    slider to link it
                  </span>
                </>
              ) : (
                <>
                  <span className='learn-dot' />
                  <span>Move a knob, fader or pad on your controller…</span>
                </>
              )}
            </div>
          )}
        </>
      );
    }

    if (midi.devices.length === 0) {
      return (
        <p className='muted'>
          No MIDI device found. Plug in your controller, it will show up here.
        </p>
      );
    }

    return (
      <div className='device-list'>
        {midi.devices.map(({ id, name }) => (
          <button
            key={id}
            type='button'
            className='device-button'
            disabled={pending !== null}
            onClick={() => void run(id, () => actions.connectMidi(id))}
          >
            <span>{name}</span>
            <span className='device-action'>
              {pending === id ? 'Connecting…' : 'Connect'}
            </span>
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className={`card${device ? ' is-on' : ''}`}>
      <div className='card-header'>
        <button
          type='button'
          className='card-toggle'
          aria-expanded={isExpanded}
          aria-label='MIDI settings'
          onClick={() => setIsOpen(!isExpanded)}
        >
          <span className='card-icon'>
            <MidiIcon />
          </span>
          <span className='card-titles'>
            <span className='card-title'>
              {device?.name ?? 'MIDI controller'}
            </span>
            <span className='card-subtitle'>
              <span className={`status-dot${device ? ' is-on' : ''}`} />
              {status}
            </span>
          </span>
          <ChevronIcon className='chevron' />
        </button>
      </div>
      {isExpanded && <div className='card-body'>{renderBody()}</div>}
    </div>
  );
};

export default MidiSection;
