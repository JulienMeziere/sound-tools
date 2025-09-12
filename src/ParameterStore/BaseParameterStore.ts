import { Logger } from '../logger';

// Parameter definition with validation and metadata
export interface ParameterDefinition {
  name: string;
  label: string;
  defaultValue: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
}

// Effect definition with all its parameters
export interface EffectDefinition {
  name: string;
  label: string;
  parameters: ParameterDefinition[];
}

// Parameter change event
export interface ParameterChangeEvent {
  effectName: string;
  parameterName: string;
  value: number;
  previousValue: number;
}

// Storage key for Chrome storage
const STORAGE_KEY = 'sound-tools-parameters';

// Effect definitions - centralized configuration
export const EFFECT_DEFINITIONS: EffectDefinition[] = [
  {
    name: 'distortion',
    label: 'Distortion',
    parameters: [
      {
        name: 'amount',
        label: 'Distortion Amount',
        defaultValue: 30,
        min: 0,
        max: 100,
        step: 1,
        unit: '%',
      },
    ],
  },
  {
    name: 'reverb',
    label: 'Reverb',
    parameters: [
      {
        name: 'roomSize',
        label: 'Room Size',
        defaultValue: 50,
        min: 0,
        max: 100,
        step: 1,
        unit: '%',
      },
      {
        name: 'mix',
        label: 'Reverb Mix',
        defaultValue: 30,
        min: 0,
        max: 100,
        step: 1,
        unit: '%',
      },
    ],
  },
  {
    name: 'filter',
    label: 'Filter',
    parameters: [
      {
        name: 'highPassFreq',
        label: 'High-Pass Frequency',
        defaultValue: 20,
        min: 0,
        max: 100,
        step: 1,
        unit: '%',
      },
      {
        name: 'highPassQ',
        label: 'High-Pass Resonance (Q)',
        defaultValue: 10,
        min: 0,
        max: 100,
        step: 1,
        unit: '%',
      },
      {
        name: 'lowPassFreq',
        label: 'Low-Pass Frequency',
        defaultValue: 80,
        min: 0,
        max: 100,
        step: 1,
        unit: '%',
      },
      {
        name: 'lowPassQ',
        label: 'Low-Pass Resonance (Q)',
        defaultValue: 10,
        min: 0,
        max: 100,
        step: 1,
        unit: '%',
      },
    ],
  },
];

/**
 * Base ParameterStore class that handles parameter management
 * This is extended by context-specific implementations
 */
export abstract class BaseParameterStore {
  protected parameters: Map<string, Map<string, number>> = new Map();
  protected effectDefinitions: Map<string, EffectDefinition> = new Map();
  protected parameterDefinitions: Map<
    string,
    Map<string, ParameterDefinition>
  > = new Map();
  protected isInitialized = false;

  constructor() {
    this.initializeDefinitions();
  }

  // Initialize effect and parameter definitions
  private initializeDefinitions(): void {
    EFFECT_DEFINITIONS.forEach((effectDef) => {
      this.effectDefinitions.set(effectDef.name, effectDef);

      const paramMap = new Map<string, ParameterDefinition>();
      effectDef.parameters.forEach((paramDef) => {
        paramMap.set(paramDef.name, paramDef);
      });
      this.parameterDefinitions.set(effectDef.name, paramMap);
    });
  }

  // Load default parameter values
  protected loadDefaultValues(): void {
    EFFECT_DEFINITIONS.forEach((effectDef) => {
      const effectParams = new Map<string, number>();
      effectDef.parameters.forEach((paramDef) => {
        effectParams.set(paramDef.name, paramDef.defaultValue);
      });
      this.parameters.set(effectDef.name, effectParams);
    });
  }

  // Load parameters from Chrome storage
  protected async loadFromStorage(): Promise<void> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get(STORAGE_KEY);
        const storedParams = result[STORAGE_KEY];

        if (storedParams && typeof storedParams === 'object') {
          // Merge stored values with defaults, validating each parameter
          Object.entries(storedParams).forEach(([effectName, effectParams]) => {
            if (
              this.parameters.has(effectName) &&
              typeof effectParams === 'object'
            ) {
              const currentParams = this.parameters.get(effectName);
              if (!currentParams) return;
              Object.entries(effectParams as Record<string, number>).forEach(
                ([paramName, value]) => {
                  if (
                    typeof value === 'number' &&
                    this.isValidParameter(effectName, paramName, value)
                  ) {
                    currentParams.set(paramName, value);
                  }
                }
              );
            }
          });
        }
      }
    } catch (error) {
      Logger.warn('Failed to load parameters from storage:', error);
    }
  }

  // Save parameters to Chrome storage
  protected async saveToStorage(): Promise<void> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const paramsObject: Record<string, Record<string, number>> = {};

        this.parameters.forEach((effectParams, effectName) => {
          paramsObject[effectName] = {};
          effectParams.forEach((value, paramName) => {
            const effectObj = paramsObject[effectName];
            if (effectObj) {
              effectObj[paramName] = value;
            }
          });
        });

        await chrome.storage.local.set({ [STORAGE_KEY]: paramsObject });
      }
    } catch (error) {
      Logger.warn('Failed to save parameters to storage:', error);
    }
  }

  // Validate parameter value against definition
  protected isValidParameter(
    effectName: string,
    parameterName: string,
    value: number
  ): boolean {
    const paramDef = this.parameterDefinitions
      .get(effectName)
      ?.get(parameterName);
    if (!paramDef) return false;

    return (
      value >= paramDef.min && value <= paramDef.max && Number.isFinite(value)
    );
  }

  // Get parameter value
  public getParameter(effectName: string, parameterName: string): number {
    const effectParams = this.parameters.get(effectName);
    if (!effectParams) {
      Logger.warn(`Effect '${effectName}' not found in parameter store`);
      return 0;
    }

    const value = effectParams.get(parameterName);
    if (value === undefined) {
      Logger.warn(
        `Parameter '${parameterName}' not found for effect '${effectName}'`
      );
      return 0;
    }

    return value;
  }

  // Get all parameters for an effect
  public getEffectParameters(effectName: string): Map<string, number> {
    const effectParams = this.parameters.get(effectName);
    if (!effectParams) {
      Logger.warn(`Effect '${effectName}' not found in parameter store`);
      return new Map();
    }
    return new Map(effectParams);
  }

  // Get all parameters as a plain object (for UI compatibility)
  public getAllParametersAsObject(): Record<string, Record<string, number>> {
    const result: Record<string, Record<string, number>> = {};

    this.parameters.forEach((effectParams, effectName) => {
      result[effectName] = {};
      effectParams.forEach((value, paramName) => {
        const effectObj = result[effectName];
        if (effectObj) {
          effectObj[paramName] = value;
        }
      });
    });

    return result;
  }

  // Get effect definition
  public getEffectDefinition(effectName: string): EffectDefinition | undefined {
    return this.effectDefinitions.get(effectName);
  }

  // Get parameter definition
  public getParameterDefinition(
    effectName: string,
    parameterName: string
  ): ParameterDefinition | undefined {
    return this.parameterDefinitions.get(effectName)?.get(parameterName);
  }

  // Get all effect definitions
  public getAllEffectDefinitions(): EffectDefinition[] {
    return Array.from(this.effectDefinitions.values());
  }

  // Abstract methods that must be implemented by context-specific classes
  public abstract initialize(): Promise<void>;
  public abstract setParameter(
    effectName: string,
    parameterName: string,
    value: number
  ): Promise<boolean>;
  public abstract cleanup(): void;
}
