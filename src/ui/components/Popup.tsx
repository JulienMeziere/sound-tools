import React from 'react';

import { EFFECTS } from '../../shared/effects';
import { useTabState } from '../useTabState';
import EffectCard from './EffectCard';
import { AlertIcon } from './Icons';
import MidiSection from './MidiSection';

interface NoticeProps {
  children: React.ReactNode;
  actions?: React.ReactNode;
}

const Notice: React.FC<NoticeProps> = ({ children, actions }) => (
  <div className='notice' role='status'>
    <AlertIcon className='notice-icon' />
    <div className='notice-content'>
      {children}
      {actions && <div className='button-group'>{actions}</div>}
    </div>
  </div>
);

const Popup: React.FC = () => {
  const { connection, state, actions } = useTabState();

  const midi = state?.midi;
  const isLinking = Boolean(midi?.isLearning && midi.lastActivity);
  const activeCount = state?.enabledEffects.length ?? 0;

  return (
    <main className='popup'>
      <header className='header'>
        <img src='/icons/icon-32.png' alt='' width='24' height='24' />
        <h1>Sound Tools</h1>
        {connection === 'ready' && (
          <span className={`pill${activeCount ? ' is-on' : ''}`}>
            {activeCount ? `${activeCount} active` : 'Bypassed'}
          </span>
        )}
      </header>

      {connection === 'loading' && (
        <div className='loading' role='status' aria-label='Loading'>
          <span />
          <span />
          <span />
        </div>
      )}

      {connection === 'unavailable' && (
        <Notice
          actions={
            <>
              <button
                type='button'
                className='button button-primary'
                onClick={() => void actions.reloadTab()}
              >
                Reload tab
              </button>
              <button
                type='button'
                className='button button-ghost'
                onClick={() => void actions.retry()}
              >
                Retry
              </button>
            </>
          }
        >
          <p>
            <strong>Sound Tools isn’t running on this page yet.</strong> Tabs
            opened before the extension was installed or updated need a reload.
          </p>
        </Notice>
      )}

      {connection === 'ready' && state && midi && (
        <>
          {!state.hasMedia && (
            <Notice
              actions={
                <button
                  type='button'
                  className='button button-ghost'
                  onClick={() => void actions.retry()}
                >
                  Retry
                </button>
              }
            >
              <p>
                <strong>No audio or video found on this page.</strong> Start
                playing something, then press Retry.
              </p>
            </Notice>
          )}
          {state.audioSuspended && (
            <Notice>
              <p>Click anywhere on the page to start audio processing.</p>
            </Notice>
          )}

          {/* MIDI first: in learn mode its hint stays visible above the targets. */}
          <section>
            <h2>MIDI</h2>
            <MidiSection midi={midi} actions={actions} />
          </section>

          <section>
            <h2>Effects</h2>
            <div className='stack'>
              {EFFECTS.map((effect) => {
                const enabled = state.enabledEffects.includes(effect.name);
                return (
                  <EffectCard
                    key={effect.name}
                    effect={effect}
                    enabled={enabled}
                    values={state.parameters[effect.name] ?? {}}
                    mappings={midi.mappings.filter(
                      (mapping) => mapping.effect === effect.name
                    )}
                    isLinking={isLinking}
                    onToggle={() =>
                      void actions.setEffectEnabled(effect.name, !enabled)
                    }
                    onParameterChange={(parameter, value) =>
                      actions.setParameter(effect.name, parameter, value)
                    }
                    onLink={(target) => void actions.linkMidi(target)}
                    onUnlink={(mapping) => void actions.unlinkMidi(mapping)}
                  />
                );
              })}
            </div>
          </section>
        </>
      )}
    </main>
  );
};

export default Popup;
