import { BaseAudioEffect } from '../AudioEffect'
import { Logger } from '../../logger'

export class DistortionEffect extends BaseAudioEffect {
  constructor() {
    super('distortion')
  }

  create(audioContext: AudioContext): AudioNode | null {
    try {
      const waveshaper = audioContext.createWaveShaper()
      const curve = this.createDistortionCurve(400)

      if (curve) {
        const properCurve = new Float32Array(
          curve.buffer as ArrayBuffer,
          curve.byteOffset,
          curve.length
        )
        waveshaper.curve = properCurve
      }

      waveshaper.oversample = '4x'
      return waveshaper
    } catch (error) {
      Logger.error('Error creating distortion effect:', error)
      return null
    }
  }
}
