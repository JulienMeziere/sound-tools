import { BaseAudioEffect } from '../AudioEffect';
import { Logger } from '../../../logger';

export class FilterEffect extends BaseAudioEffect {
  constructor() {
    super('filter');
  }

  create(audioContext: AudioContext): AudioNode | null {
    try {
      // Create high-pass filter (first in chain)
      const highPass = audioContext.createBiquadFilter();
      highPass.type = 'highpass';
      highPass.frequency.value = 20; // Will be set by applyStoredParameters
      highPass.Q.value = 0.1; // Will be set by applyStoredParameters

      // Create low-pass filter (second in chain)
      const lowPass = audioContext.createBiquadFilter();
      lowPass.type = 'lowpass';
      lowPass.frequency.value = 20000; // Will be set by applyStoredParameters
      lowPass.Q.value = 0.1; // Will be set by applyStoredParameters

      // Connect high-pass to low-pass
      highPass.connect(lowPass);

      // Store both filters on the high-pass node for parameter updates
      (
        highPass as AudioNode & {
          highPass?: BiquadFilterNode;
          lowPass?: BiquadFilterNode;
        }
      ).highPass = highPass;
      (
        highPass as AudioNode & {
          highPass?: BiquadFilterNode;
          lowPass?: BiquadFilterNode;
        }
      ).lowPass = lowPass;

      return highPass; // Return input node, but output comes from lowPass
    } catch (error) {
      Logger.error('Error creating filter effect:', error);
      return null;
    }
  }

  override updateParameter(
    node: AudioNode,
    parameterName: string,
    value: number
  ): void {
    const { highPass } = node as AudioNode & { highPass?: BiquadFilterNode };
    const { lowPass } = node as AudioNode & { lowPass?: BiquadFilterNode };

    if (!highPass || !lowPass) {
      Logger.error('FilterEffect: Invalid node - missing dual filter setup');
      return;
    }

    try {
      switch (parameterName) {
        case 'highPassFreq': {
          // Map 0-100 to 20Hz-20000Hz (logarithmic scale)
          const frequency = 20 * Math.pow(1000, value / 100); // 20Hz to 20kHz
          highPass.frequency.value = frequency;
          break;
        }
        case 'highPassQ': {
          // Map 0-100 to 0.1-50 (exponential for strong but controlled resonance)
          const q = 0.1 * Math.pow(500, value / 100); // 0.1 to 50
          highPass.Q.value = q;
          break;
        }
        case 'lowPassFreq': {
          // Map 0-100 to 20Hz-20000Hz (logarithmic scale)
          const frequency = 20 * Math.pow(1000, value / 100); // 20Hz to 20kHz
          lowPass.frequency.value = frequency;
          break;
        }
        case 'lowPassQ': {
          // Map 0-100 to 0.1-50 (exponential for strong but controlled resonance)
          const q = 0.1 * Math.pow(500, value / 100); // 0.1 to 50
          lowPass.Q.value = q;
          break;
        }
        default:
          Logger.warn(`FilterEffect: Unknown parameter '${parameterName}'`);
      }
    } catch (error) {
      Logger.error(
        `Error updating filter parameter '${parameterName}':`,
        error
      );
    }
  }
}
