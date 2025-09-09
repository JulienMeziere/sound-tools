import { BaseAudioEffect } from '../AudioEffect'
import { Logger } from '../../logger'

export class FilterEffect extends BaseAudioEffect {
  constructor() {
    super('filter')
  }

  create(audioContext: AudioContext): AudioNode | null {
    try {
      const filter = audioContext.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.value = 1000
      filter.Q.value = 1
      return filter
    } catch (error) {
      Logger.error('Error creating filter effect:', error)
      return null
    }
  }
}
