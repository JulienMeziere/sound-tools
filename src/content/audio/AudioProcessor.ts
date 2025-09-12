import { Logger } from '../../logger';
import { ParameterChangeEvent } from '../../ParameterStore/BaseParameterStore';
import { contentParameterStore } from '../../ParameterStore/ContentParameterStore';
import { AudioEffect } from './AudioEffect';
import { DistortionEffect } from './effects/DistortionEffect';
import { FilterEffect } from './effects/FilterEffect';
import { ReverbEffect } from './effects/ReverbEffect';
export class AudioProcessor {
  private audioContext: AudioContext | null = null;
  private readonly sourceNodes: Map<
    HTMLMediaElement,
    MediaElementAudioSourceNode
  > = new Map();
  private readonly effectNodes: Map<string, AudioNode> = new Map();
  private readonly enabledEffects: Set<string> = new Set();
  private readonly availableEffects: Map<string, AudioEffect> = new Map();

  // Effect processing order: Distortion > Reverb > Filter
  private static readonly EFFECT_ORDER = ['distortion', 'reverb', 'filter'];

  constructor() {
    this.initializeEffects();
    void this.initializeParameterStore();
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

  private async initializeParameterStore(): Promise<void> {
    // Initialize the parameter store
    await contentParameterStore.initialize();

    // Listen for parameter changes
    contentParameterStore.addParameterChangeListener(
      this.handleParameterChange
    );
  }

  // ParameterStoreListener implementation
  public handleParameterChange = (event: ParameterChangeEvent): void => {
    this.applyParameterToEffect(
      event.effectName,
      event.parameterName,
      event.value
    );
  };

  getEnabledEffects(): Set<string> {
    return new Set(this.enabledEffects);
  }

  enableEffect(effectName: string): boolean {
    if (
      this.availableEffects.has(effectName) &&
      !this.enabledEffects.has(effectName)
    ) {
      this.enabledEffects.add(effectName);
      this.setupAudioProcessing();
      this.rebuildAudioChain();
      return true; // State changed
    }
    return false; // State didn't change
  }

  disableEffect(effectName: string): boolean {
    if (this.enabledEffects.has(effectName)) {
      this.enabledEffects.delete(effectName);
      this.rebuildAudioChain();
      return true; // State changed
    }
    return false; // State didn't change
  }

  updateEffectParameter(
    effectName: string,
    parameterName: string,
    value: number
  ): void {
    // Store in parameter store (this will trigger handleParameterChange)
    void contentParameterStore.setParameter(effectName, parameterName, value);
  }

  // Apply parameter to effect if it exists and is enabled
  private applyParameterToEffect(
    effectName: string,
    parameterName: string,
    value: number
  ): void {
    const effectNode = this.effectNodes.get(effectName);
    const effect = this.availableEffects.get(effectName);

    if (!effectNode || !effect) {
      // Effect not enabled, parameter is already stored in ParameterStore
      return;
    }

    effect.updateParameter(effectNode, parameterName, value);
  }

  private applyStoredParameters(
    effectName: string,
    effectNode: AudioNode,
    effect: AudioEffect
  ): void {
    // Get parameters from ContentParameterStore
    const storedParams = contentParameterStore.getEffectParameters(effectName);
    storedParams.forEach((value, paramName) => {
      effect.updateParameter(effectNode, paramName, value);
    });
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

  // Cleanup method to properly dispose of audio resources
  cleanup(): void {
    // Remove parameter store listener
    contentParameterStore.removeParameterChangeListener(
      this.handleParameterChange
    );

    // Disconnect all audio nodes
    this.sourceNodes.forEach((sourceNode) => {
      sourceNode.disconnect();
    });

    this.effectNodes.forEach((effectNode) => {
      effectNode.disconnect();
    });

    // Clear all maps and sets
    this.sourceNodes.clear();
    this.effectNodes.clear();
    this.enabledEffects.clear();

    // Close AudioContext to free resources
    if (this.audioContext) {
      // AudioContext.close() is async but we don't need to wait
      this.audioContext.close().catch((error) => {
        Logger.warn('Error closing AudioContext:', error);
      });
      this.audioContext = null;
    }

    Logger.info('AudioProcessor cleanup completed');
  }
}
