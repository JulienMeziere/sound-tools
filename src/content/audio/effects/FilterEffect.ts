import { type Effect, glideTo, logScale } from './Effect';

/** High-pass followed by low-pass, each with its own resonance. */
export class FilterEffect implements Effect {
  readonly input: BiquadFilterNode;
  readonly output: BiquadFilterNode;

  constructor(private readonly context: AudioContext) {
    this.input = new BiquadFilterNode(context, { type: 'highpass' });
    this.output = new BiquadFilterNode(context, { type: 'lowpass' });
    this.input.connect(this.output);
  }

  setParameter(name: string, value: number): void {
    switch (name) {
      case 'highPassFreq':
        glideTo(this.context, this.input.frequency, toFrequency(value));
        break;
      case 'highPassQ':
        glideTo(this.context, this.input.Q, toQ(value));
        break;
      case 'lowPassFreq':
        glideTo(this.context, this.output.frequency, toFrequency(value));
        break;
      case 'lowPassQ':
        glideTo(this.context, this.output.Q, toQ(value));
        break;
    }
  }
}

/** 0-100 -> 20 Hz - 20 kHz */
const toFrequency = (value: number): number => logScale(value, 20, 20000);

/** 0-100 -> Q 0.1 - 50 */
const toQ = (value: number): number => logScale(value, 0.1, 50);
