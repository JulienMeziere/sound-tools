import { type Effect, glideTo } from './Effect';

/** Number of pre-defined rooms the "Room Size" parameter steps through. */
const ROOM_COUNT = 20;

/** Convolution reverb with a dry/wet mix. */
export class ReverbEffect implements Effect {
  readonly input: GainNode;
  readonly output: GainNode;
  private readonly dry: GainNode;
  private readonly wet: GainNode;
  private readonly convolver: ConvolverNode;
  // Impulse responses are generated lazily (the largest ones take a while).
  private readonly rooms = new Map<number, AudioBuffer>();
  private currentRoom = -1;

  constructor(private readonly context: AudioContext) {
    this.input = new GainNode(context);
    this.output = new GainNode(context);
    this.dry = new GainNode(context, { gain: 1 });
    this.wet = new GainNode(context, { gain: 0 });
    this.convolver = new ConvolverNode(context);

    this.input.connect(this.dry).connect(this.output);
    this.input.connect(this.convolver).connect(this.wet).connect(this.output);
    this.selectRoom(0);
  }

  setParameter(name: string, value: number): void {
    switch (name) {
      case 'mix': {
        const wet = value / 100;
        glideTo(this.context, this.wet.gain, wet);
        glideTo(this.context, this.dry.gain, 1 - wet);
        break;
      }
      case 'roomSize':
        this.selectRoom(Math.round((value / 100) * (ROOM_COUNT - 1)));
        break;
    }
  }

  private selectRoom(index: number): void {
    // Swapping the buffer restarts the convolution, so only do it on change.
    if (index === this.currentRoom) return;
    this.currentRoom = index;

    let buffer = this.rooms.get(index);
    if (!buffer) {
      buffer = this.createImpulseResponse(index / (ROOM_COUNT - 1));
      this.rooms.set(index, buffer);
    }
    this.convolver.buffer = buffer;
  }

  /** `size` 0-1: from a 0.3s tight booth to a 4s hall. */
  private createImpulseResponse(size: number): AudioBuffer {
    const duration = 0.3 + size * 3.7;
    const decay = 1 + size * 4;
    const { sampleRate } = this.context;
    const length = Math.floor(sampleRate * duration);
    const impulse = this.context.createBuffer(2, length, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const data = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
    }
    return impulse;
  }
}
