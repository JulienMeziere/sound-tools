import { AudioEffect } from './AudioEffect';
import { DistortionEffect } from './effects/DistortionEffect';
import { FilterEffect } from './effects/FilterEffect';
import { ReverbEffect } from './effects/ReverbEffect';
import { Logger } from '../logger';

export class AudioProcessor {
  private audioContext: AudioContext | null = null;
  private readonly sourceNodes: Map<
    HTMLMediaElement,
    MediaElementAudioSourceNode
  > = new Map();
  private readonly effectNodes: Map<string, AudioNode> = new Map();
  private readonly enabledEffects: Set<string> = new Set();
  private readonly availableEffects: Map<string, AudioEffect> = new Map();
  private readonly effectParameters: Map<string, Map<string, number>> =
    new Map();

  // Effect processing order: Distortion > Reverb > Filter
  private static readonly EFFECT_ORDER = ['distortion', 'reverb', 'filter'];

  constructor() {
    this.initializeEffects();
    this.initializeDefaultParameters();
  }

  private initializeEffects(): void {
    const effects = [
      new FilterEffect(),
      new DistortionEffect(),
      new ReverbEffect(),
    ];

    effects.forEach((effect) => {
      this.availableEffects.set(effect.name, effect);
    });
  }

  private initializeDefaultParameters(): void {
    // Initialize default parameter values that match UI defaults
    this.effectParameters.set('distortion', new Map([['amount', 30]]));
    this.effectParameters.set(
      'reverb',
      new Map([
        ['roomSize', 50],
        ['mix', 30], // 30% wet by default
      ])
    );
    this.effectParameters.set(
      'filter',
      new Map([
        ['highPassFreq', 20], // 20Hz default for high-pass
        ['highPassQ', 10], // Default Q for high-pass
        ['lowPassFreq', 80], // 20kHz default for low-pass
        ['lowPassQ', 10], // Default Q for low-pass
      ])
    );
  }

  getEnabledEffects(): Set<string> {
    return new Set(this.enabledEffects);
  }

  enableEffect(effectName: string): void {
    if (
      this.availableEffects.has(effectName) &&
      !this.enabledEffects.has(effectName)
    ) {
      this.enabledEffects.add(effectName);
      this.setupAudioProcessing();
      this.rebuildAudioChain();
    }
  }

  disableEffect(effectName: string): void {
    if (this.enabledEffects.has(effectName)) {
      this.enabledEffects.delete(effectName);
      this.rebuildAudioChain();
    }
  }

  updateEffectParameter(
    effectName: string,
    parameterName: string,
    value: number
  ): void {
    // Store the parameter value
    if (!this.effectParameters.has(effectName)) {
      this.effectParameters.set(effectName, new Map());
    }
    this.effectParameters.get(effectName)?.set(parameterName, value);

    // Apply to current effect node if it exists
    const effectNode = this.effectNodes.get(effectName);
    const effect = this.availableEffects.get(effectName);

    if (!effectNode || !effect) {
      Logger.error(`Effect '${effectName}' not found or not enabled`);
      return;
    }

    effect.updateParameter(effectNode, parameterName, value);
  }

  private applyStoredParameters(
    effectName: string,
    effectNode: AudioNode,
    effect: AudioEffect
  ): void {
    const storedParams = this.effectParameters.get(effectName);
    if (storedParams) {
      storedParams.forEach((value, paramName) => {
        effect.updateParameter(effectNode, paramName, value);
      });
    }
  }

  private setupAudioProcessing(): void {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
      Logger.info('Created new AudioContext');
    }

    const audioElements = document.querySelectorAll('audio, video');
    Logger.info(`Found ${audioElements.length} media elements`);

    audioElements.forEach((element) => {
      const mediaElement = element as HTMLMediaElement;
      Logger.info(
        `Setting up media element: ${mediaElement.tagName}`,
        mediaElement.src || 'no src'
      );
      this.setupMediaElement(mediaElement);
    });
  }

  private setupMediaElement(mediaElement: HTMLMediaElement): void {
    if (!this.audioContext) return;

    try {
      if (this.sourceNodes.has(mediaElement)) {
        return; // Already set up
      }

      const source = this.audioContext.createMediaElementSource(mediaElement);
      this.sourceNodes.set(mediaElement, source);
      this.connectAudioChain(source);
    } catch (error) {
      Logger.error('Error setting up media element:', error);
    }
  }

  private rebuildAudioChain(): void {
    if (!this.audioContext) return;

    // Disconnect all existing connections
    this.sourceNodes.forEach((sourceNode) => {
      sourceNode.disconnect();
    });

    this.effectNodes.forEach((effectNode) => {
      effectNode.disconnect();
    });

    // Clear effect nodes and rebuild only enabled effects
    this.effectNodes.clear();

    // Rebuild the audio chain for each media element
    this.sourceNodes.forEach((sourceNode) => {
      this.connectAudioChain(sourceNode);
    });
  }

  private connectAudioChain(sourceNode: MediaElementAudioSourceNode): void {
    if (!this.audioContext) return;

    let currentNode: AudioNode = sourceNode;
    const { destination } = this.audioContext;

    // Create effect nodes for enabled effects in the specified order
    AudioProcessor.EFFECT_ORDER.forEach((effectName) => {
      if (this.enabledEffects.has(effectName)) {
        const effect = this.availableEffects.get(effectName);
        if (effect && this.audioContext) {
          const effectNode = effect.create(this.audioContext);
          if (effectNode) {
            this.effectNodes.set(effectName, effectNode);

            // Apply stored parameter values to the newly created effect
            this.applyStoredParameters(effectName, effectNode, effect);

            currentNode.connect(effectNode);

            // Handle compound effects with separate input/output nodes
            const filterOutput = (
              effectNode as AudioNode & { lowPass?: AudioNode }
            ).lowPass;
            const reverbOutput = (
              effectNode as AudioNode & { outputMixer?: AudioNode }
            ).outputMixer;
            const outputNode = filterOutput || reverbOutput || effectNode;
            currentNode = outputNode;
          }
        }
      }
    });

    // Connect the final node to destination
    currentNode.connect(destination);
  }

  // Method to handle new media elements being added dynamically
  handleNewMediaElements(): void {
    const audioElements = document.querySelectorAll('audio, video');
    audioElements.forEach((element) => {
      this.setupMediaElement(element as HTMLMediaElement);
    });
  }
}
