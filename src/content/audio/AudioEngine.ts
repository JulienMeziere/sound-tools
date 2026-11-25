import {
  EFFECTS,
  type EffectName,
  type ParameterValues,
} from '../../shared/effects';
import { Logger } from '../../shared/logger';
import { EFFECT_FACTORIES, type Effect } from './effects';

/**
 * Routes every <audio>/<video> element of the page through a single effect
 * chain:  media sources -> input bus -> [enabled effects...] -> destination
 *
 * The AudioContext is created lazily the first time an effect is enabled:
 * capturing a media element is irreversible, so pages where the extension is
 * never used are left untouched.
 */
export class AudioEngine {
  private context: AudioContext | null = null;
  private input: GainNode | null = null;
  private effects: Map<EffectName, Effect> | null = null;
  private readonly enabled = new Set<EffectName>();
  private readonly captured = new WeakSet<HTMLMediaElement>();

  constructor(
    private readonly getParameters: () => ParameterValues,
    private readonly onSuspendedChange: () => void
  ) {}

  get enabledEffects(): EffectName[] {
    return EFFECTS.map((effect) => effect.name).filter((name) =>
      this.enabled.has(name)
    );
  }

  /** Chrome's autoplay policy may keep the context paused until a page click. */
  get isSuspended(): boolean {
    return this.context?.state === 'suspended';
  }

  setEnabled(effect: EffectName, enabled: boolean): boolean {
    if (this.enabled.has(effect) === enabled) return false;
    if (enabled) {
      this.enabled.add(effect);
      this.start();
    } else {
      this.enabled.delete(effect);
    }
    this.rewire();
    return true;
  }

  setParameter(effect: EffectName, parameter: string, value: number): void {
    this.effects?.get(effect)?.setParameter(parameter, value);
  }

  /** Re-applies all parameters (e.g. after another tab changed them). */
  applyParameters(values: ParameterValues): void {
    this.effects?.forEach((effect, name) => {
      Object.entries(values[name] ?? {}).forEach(([parameter, value]) =>
        effect.setParameter(parameter, value)
      );
    });
  }

  private start(): void {
    if (this.context) {
      void this.resume();
      return;
    }

    const context = new AudioContext();
    this.context = context;
    this.input = new GainNode(context);
    this.effects = new Map(
      EFFECTS.map(({ name }) => [name, EFFECT_FACTORIES[name](context)])
    );
    this.applyParameters(this.getParameters());

    context.addEventListener('statechange', this.onSuspendedChange);
    void this.resume();

    this.scanMedia();
    // `play` does not bubble but can be caught during capture: this picks up
    // media elements added later (SPAs, ads, preview players...).
    document.addEventListener(
      'play',
      (event) => {
        if (event.target instanceof HTMLMediaElement) {
          this.capture(event.target);
          void this.resume();
        }
      },
      true
    );
    // Fallback for the autoplay policy: resume on the first page interaction.
    const resumeOnGesture = (): void => void this.resume();
    ['pointerdown', 'keydown'].forEach((type) =>
      document.addEventListener(type, resumeOnGesture, true)
    );

    Logger.info('Audio engine started');
  }

  /**
   * Looks for media elements, captures the new ones once the engine runs, and
   * returns whether the page has any.
   */
  scanMedia(): boolean {
    const elements =
      document.querySelectorAll<HTMLMediaElement>('audio, video');
    elements.forEach((element) => this.capture(element));
    return elements.length > 0;
  }

  private async resume(): Promise<void> {
    if (this.context?.state !== 'suspended') return;
    try {
      await this.context.resume();
    } catch (error) {
      Logger.debug('AudioContext resume deferred:', error);
    }
  }

  private capture(element: HTMLMediaElement): void {
    if (!this.context || !this.input || this.captured.has(element)) return;
    this.captured.add(element);
    try {
      this.context.createMediaElementSource(element).connect(this.input);
      Logger.info('Captured media element', element.currentSrc || element);
    } catch (error) {
      // Typically: the element is already routed to another AudioContext.
      Logger.warn('Cannot process this media element:', error);
    }
  }

  private rewire(): void {
    if (!this.context || !this.input || !this.effects) return;

    this.input.disconnect();
    this.effects.forEach((effect) => effect.output.disconnect());

    let node: AudioNode = this.input;
    for (const name of this.enabledEffects) {
      const effect = this.effects.get(name);
      if (!effect) continue;
      node.connect(effect.input);
      node = effect.output;
    }
    node.connect(this.context.destination);
  }
}
