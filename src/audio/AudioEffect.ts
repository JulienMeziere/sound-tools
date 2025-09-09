import { Logger } from '../logger'

export interface AudioEffect {
  readonly name: string
  create(audioContext: AudioContext): AudioNode | null
}

export abstract class BaseAudioEffect implements AudioEffect {
  constructor(public readonly name: string) {}

  abstract create(audioContext: AudioContext): AudioNode | null

  protected createImpulseResponse(
    audioContext: AudioContext,
    duration: number,
    decay: number,
    reverse: boolean
  ): AudioBuffer | null {
    try {
      const length = audioContext.sampleRate * duration
      const impulse = audioContext.createBuffer(
        2,
        length,
        audioContext.sampleRate
      )

      for (let channel = 0; channel < 2; channel++) {
        const channelData = impulse.getChannelData(channel)
        for (let i = 0; i < length; i++) {
          const n = reverse ? length - i : i
          channelData[i] =
            (Math.random() * 2 - 1) * Math.pow(1 - n / length, decay)
        }
      }

      return impulse
    } catch (error) {
      Logger.error(`Error creating impulse response for ${this.name}:`, error)
      return null
    }
  }

  protected createDistortionCurve(amount: number): Float32Array | null {
    try {
      const samples = 44100
      const buffer = new ArrayBuffer(samples * 4)
      const curve = new Float32Array(buffer)
      const deg = Math.PI / 180

      for (let i = 0; i < samples; i++) {
        const x = (i * 2) / samples - 1
        curve[i] =
          ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x))
      }

      return curve
    } catch (error) {
      Logger.error(`Error creating distortion curve for ${this.name}:`, error)
      return null
    }
  }
}
