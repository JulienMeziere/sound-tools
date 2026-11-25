import {
  defaultParameterValues,
  sanitizeParameter,
  type EffectName,
  type ParameterValues,
} from '../shared/effects';
import { ParameterStorage } from '../shared/storage';

const SAVE_DELAY_MS = 300;

/**
 * Effect parameter values for this tab, persisted (debounced) to storage and
 * kept in sync with changes made from other tabs.
 */
export class ParameterState {
  private values: ParameterValues = defaultParameterValues();
  private saveTimer: number | null = null;
  private lastSaved = '';

  constructor(private readonly onExternalChange: () => void) {}

  async load(): Promise<void> {
    this.values = await ParameterStorage.load();
    this.lastSaved = JSON.stringify(this.values);

    ParameterStorage.onChange((values) => {
      const serialized = JSON.stringify(values);
      // Ignore the echo of our own writes, and anything older than a pending save.
      if (serialized === this.lastSaved || this.saveTimer !== null) return;
      this.lastSaved = serialized;
      this.values = values;
      this.onExternalChange();
    });
  }

  get all(): ParameterValues {
    return this.values;
  }

  /** Returns the clamped value that was stored, or null if invalid. */
  set(effect: EffectName, parameter: string, value: number): number | null {
    const sanitized = sanitizeParameter(effect, parameter, value);
    const effectValues = this.values[effect];
    if (sanitized === null || !effectValues) return null;

    effectValues[parameter] = sanitized;
    this.scheduleSave();
    return sanitized;
  }

  private scheduleSave(): void {
    if (this.saveTimer !== null) window.clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => {
      this.saveTimer = null;
      this.lastSaved = JSON.stringify(this.values);
      void ParameterStorage.save(this.values);
    }, SAVE_DELAY_MS);
  }
}
