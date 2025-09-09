import { BaseAudioEffect } from '../AudioEffect'
import { Logger } from '../../logger'

export class ReverbEffect extends BaseAudioEffect {
  constructor() {
    super('reverb')
  }

  private createImpulseResponse(
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

  create(audioContext: AudioContext): AudioNode | null {
    try {
      const convolver = audioContext.createConvolver()
      const impulseResponse = this.createImpulseResponse(
        audioContext,
        2,
        2,
        false
      )

      if (!impulseResponse) {
        Logger.error('Failed to create impulse response for reverb')
        return null
      }

      convolver.buffer = impulseResponse
      return convolver
    } catch (error) {
      Logger.error('Error creating reverb effect:', error)
      return null
    }
  }

  override updateParameter(
    _node: AudioNode,
    parameterName: string,
    _value: number
  ): void {
    // TODO: Implement reverb parameter updates (roomSize, decay, etc.)
    Logger.warn(
      `ReverbEffect: Parameter '${parameterName}' not yet implemented`
    )
  }
}
