import type { Effect } from './Effect';

const CURVE_SAMPLES = 8192;

export class DistortionEffect implements Effect {
  readonly input: WaveShaperNode;
  readonly output: WaveShaperNode;

  constructor(context: AudioContext) {
    this.input = new WaveShaperNode(context, { oversample: '4x' });
    this.input.curve = createCurve(0);
    this.output = this.input;
  }

  setParameter(name: string, value: number): void {
    if (name !== 'amount') return;
    // Exponential mapping for a natural progression: 0-100 -> 0-800
    this.input.curve = createCurve(Math.pow(value / 100, 2.5) * 800);
  }
}

const createCurve = (amount: number): Float32Array<ArrayBuffer> => {
  const curve = new Float32Array(CURVE_SAMPLES);
  const deg = Math.PI / 180;
  for (let i = 0; i < CURVE_SAMPLES; i++) {
    const x = (i * 2) / (CURVE_SAMPLES - 1) - 1;
    curve[i] =
      amount === 0
        ? x
        : ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
  }
  return curve;
};
