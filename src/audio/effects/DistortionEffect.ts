import { BaseAudioEffect } from '../AudioEffect'
import { Logger } from '../../logger'

export class DistortionEffect extends BaseAudioEffect {
  constructor() {
    super('distortion')
  }

  private createDistortionCurve(amount: number): Float32Array | null {
    try {
      const samples = 44100
      const buffer = new ArrayBuffer(samples * 4)
      const curve = new Float32Array(buffer)

      if (amount === 0) {
        // Linear curve (no distortion) when amount is 0
        for (let i = 0; i < samples; i++) {
          const x = (i * 2) / samples - 1
          curve[i] = x
        }
      } else {
        // Distortion curve with amount scaling
        const deg = Math.PI / 180
        for (let i = 0; i < samples; i++) {
          const x = (i * 2) / samples - 1
          curve[i] =
            ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x))
        }
      }

      return curve
    } catch (error) {
      Logger.error(`Error creating distortion curve for ${this.name}:`, error)
      return null
    }
  }

  create(audioContext: AudioContext): AudioNode | null {
    try {
      const waveshaper = audioContext.createWaveShaper()
      // Start with 50% distortion (mapped from 0-100 range to 0-800 internal range)
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

  override updateParameter(
    node: AudioNode,
    parameterName: string,
    value: number
  ): void {
    if (!(node instanceof WaveShaperNode)) {
      Logger.error('DistortionEffect: Invalid node type for parameter update')
      return
    }

    try {
      switch (parameterName) {
        case 'amount': {
          // Exponential mapping for more natural distortion progression
          // 0 = no distortion, 100 = maximum distortion
          // Using exponential curve: amount = (value/100)^2.5 * 800
          const normalizedValue = value / 100 // 0-1 range
          const exponentialValue = Math.pow(normalizedValue, 2.5) // Exponential curve
          const internalAmount = exponentialValue * 800 // Scale to 0-800
          const curve = this.createDistortionCurve(internalAmount)

          if (curve) {
            const properCurve = new Float32Array(
              curve.buffer as ArrayBuffer,
              curve.byteOffset,
              curve.length
            )
            node.curve = properCurve
          }
          break
        }
        default:
          Logger.error(`DistortionEffect: Unknown parameter '${parameterName}'`)
      }
    } catch (error) {
      Logger.error(
        `Error updating distortion parameter '${parameterName}':`,
        error
      )
    }
  }
}
