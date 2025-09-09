export interface AudioEffect {
  readonly name: string
  create(audioContext: AudioContext): AudioNode | null
  updateParameter(node: AudioNode, parameterName: string, value: number): void
}

export abstract class BaseAudioEffect implements AudioEffect {
  constructor(public readonly name: string) {}

  abstract create(audioContext: AudioContext): AudioNode | null

  // Default implementation - override in specific effects
  updateParameter(
    _node: AudioNode,
    _parameterName: string,
    _value: number
  ): void {
    // No-op by default - specific effects can override
  }
}
