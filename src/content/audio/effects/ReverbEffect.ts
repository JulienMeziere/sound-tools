import { BaseAudioEffect } from '../AudioEffect';
import { Logger } from '../../../logger';

export class ReverbEffect extends BaseAudioEffect {
  private impulseResponseBank: AudioBuffer[] = [];

  constructor() {
    super('reverb');
  }

  private createImpulseResponse(
    audioContext: AudioContext,
    duration: number,
    decay: number,
    reverse: boolean
  ): AudioBuffer | null {
    try {
      const length = audioContext.sampleRate * duration;
      const impulse = audioContext.createBuffer(
        2,
        length,
        audioContext.sampleRate
      );

      for (let channel = 0; channel < 2; channel++) {
        const channelData = impulse.getChannelData(channel);
        for (let i = 0; i < length; i++) {
          const n = reverse ? length - i : i;
          channelData[i] =
            (Math.random() * 2 - 1) * Math.pow(1 - n / length, decay);
        }
      }

      return impulse;
    } catch (error) {
      Logger.error(`Error creating impulse response for ${this.name}:`, error);
      return null;
    }
  }

  private generateImpulseResponseBank(audioContext: AudioContext): void {
    this.impulseResponseBank = [];

    for (let i = 0; i < 20; i++) {
      const roomPercent = i / 19;
      const duration = 0.3 + roomPercent * 3.7;
      const decay = 1 + roomPercent * 4;
      const reverse = false;

      const impulseResponse = this.createImpulseResponse(
        audioContext,
        duration,
        decay,
        reverse
      );

      if (impulseResponse) {
        this.impulseResponseBank.push(impulseResponse);
      } else {
        Logger.error(`Failed to generate impulse response ${i}`);
      }
    }
  }

  create(audioContext: AudioContext): AudioNode | null {
    try {
      // Generate impulse response bank if not already generated
      if (this.impulseResponseBank.length === 0) {
        this.generateImpulseResponseBank(audioContext);
      }

      // Create dry path (direct signal)
      const dryGain = audioContext.createGain();
      dryGain.gain.value = 1.0; // Will be set by applyStoredParameters

      // Create wet path (reverb signal)
      const wetGain = audioContext.createGain();
      wetGain.gain.value = 0.0; // Will be set by applyStoredParameters

      // Create convolver for reverb
      const convolver = audioContext.createConvolver();

      // Use first room size as placeholder (will be set by applyStoredParameters)
      const [placeholderImpulse] = this.impulseResponseBank;

      if (!placeholderImpulse) {
        Logger.error('Failed to get placeholder impulse response from bank');
        return null;
      }
      convolver.buffer = placeholderImpulse;

      // Create input splitter and output mixer
      const inputSplitter = audioContext.createGain();
      const outputMixer = audioContext.createGain();

      // Connect signal path: input → splitter → [dry, wet] → mixer → output
      inputSplitter.connect(dryGain);
      inputSplitter.connect(convolver);
      convolver.connect(wetGain);
      dryGain.connect(outputMixer);
      wetGain.connect(outputMixer);

      // Store references for parameter updates
      (
        inputSplitter as AudioNode & {
          dryGain?: GainNode;
          wetGain?: GainNode;
          outputMixer?: GainNode;
          convolver?: ConvolverNode;
          impulseBank?: AudioBuffer[];
        }
      ).dryGain = dryGain;
      (
        inputSplitter as AudioNode & {
          dryGain?: GainNode;
          wetGain?: GainNode;
          outputMixer?: GainNode;
          convolver?: ConvolverNode;
          impulseBank?: AudioBuffer[];
        }
      ).wetGain = wetGain;
      (
        inputSplitter as AudioNode & {
          dryGain?: GainNode;
          wetGain?: GainNode;
          outputMixer?: GainNode;
          convolver?: ConvolverNode;
          impulseBank?: AudioBuffer[];
        }
      ).outputMixer = outputMixer;
      (
        inputSplitter as AudioNode & {
          dryGain?: GainNode;
          wetGain?: GainNode;
          outputMixer?: GainNode;
          convolver?: ConvolverNode;
          impulseBank?: AudioBuffer[];
        }
      ).convolver = convolver;
      (
        inputSplitter as AudioNode & {
          dryGain?: GainNode;
          wetGain?: GainNode;
          outputMixer?: GainNode;
          convolver?: ConvolverNode;
          impulseBank?: AudioBuffer[];
        }
      ).impulseBank = this.impulseResponseBank;

      return inputSplitter;
    } catch (error) {
      Logger.error('Error creating reverb effect:', error);
      return null;
    }
  }

  override updateParameter(
    node: AudioNode,
    parameterName: string,
    value: number
  ): void {
    const { dryGain } = node as AudioNode & { dryGain?: GainNode };
    const { wetGain } = node as AudioNode & { wetGain?: GainNode };
    const { convolver } = node as AudioNode & { convolver?: ConvolverNode };
    const { impulseBank } = node as AudioNode & { impulseBank?: AudioBuffer[] };

    if (!dryGain || !wetGain) {
      Logger.error('ReverbEffect: Invalid node - missing gain nodes');
      return;
    }

    try {
      switch (parameterName) {
        case 'mix': {
          // Map 0-100 to wet/dry mix
          // 0% = 100% dry, 0% wet
          // 100% = 0% dry, 100% wet
          const wetLevel = value / 100;
          const dryLevel = 1 - wetLevel;

          dryGain.gain.value = dryLevel;
          wetGain.gain.value = wetLevel;
          break;
        }
        case 'roomSize': {
          if (!convolver || !impulseBank || impulseBank.length === 0) {
            Logger.error(
              'ReverbEffect: Missing convolver or impulse bank for room size update'
            );
            return;
          }

          // Map 0-100 to bank index (0-19)
          const bankIndex = Math.floor(
            (value / 100) * (impulseBank.length - 1)
          );
          const clampedIndex = Math.max(
            0,
            Math.min(bankIndex, impulseBank.length - 1)
          );

          // Switch to the selected impulse response instantly
          const selectedImpulse = impulseBank[clampedIndex];
          if (selectedImpulse) {
            convolver.buffer = selectedImpulse;
          } else {
            Logger.error(
              `ReverbEffect: Invalid impulse response at index ${clampedIndex}`
            );
            return;
          }

          break;
        }
        default:
          Logger.warn(`ReverbEffect: Unknown parameter '${parameterName}'`);
      }
    } catch (error) {
      Logger.error(
        `Error updating reverb parameter '${parameterName}':`,
        error
      );
    }
  }
}
