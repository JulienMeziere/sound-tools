/**
 * An audio effect is a small sub-graph with one input and one output node.
 * It is created once per AudioContext and stays alive while disabled, so
 * parameter changes always reach the nodes that are actually playing.
 */
export interface Effect {
  readonly input: AudioNode;
  readonly output: AudioNode;
  /** `value` is on the 0-100 UI scale. */
  setParameter(name: string, value: number): void;
}

/** Short time constant: slider moves are heard immediately but without clicks. */
const SMOOTHING_SECONDS = 0.015;

export const glideTo = (
  context: BaseAudioContext,
  param: AudioParam,
  value: number
): void => {
  const now = context.currentTime;
  if (typeof param.cancelAndHoldAtTime === 'function') {
    param.cancelAndHoldAtTime(now);
  } else {
    param.cancelScheduledValues(now);
  }
  param.setTargetAtTime(value, now, SMOOTHING_SECONDS);
};

/** Maps 0-100 to [min, max] on a logarithmic scale. */
export const logScale = (value: number, min: number, max: number): number =>
  min * Math.pow(max / min, value / 100);
