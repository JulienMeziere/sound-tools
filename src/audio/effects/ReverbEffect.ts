import { BaseAudioEffect } from '../AudioEffect'
import { Logger } from '../../logger'

export class ReverbEffect extends BaseAudioEffect {
  constructor() {
    super('reverb')
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
}
