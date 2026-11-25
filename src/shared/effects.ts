export interface ParameterDefinition {
  name: string;
  label: string;
  defaultValue: number;
  min: number;
  max: number;
}

export interface EffectDefinition {
  name: EffectName;
  label: string;
  parameters: ParameterDefinition[];
}

export type EffectName = 'distortion' | 'reverb' | 'filter';

/** effect name -> parameter name -> value (0-100 UI scale) */
export type ParameterValues = Record<string, Record<string, number>>;

const percent = (
  name: string,
  label: string,
  defaultValue: number
): ParameterDefinition => ({ name, label, defaultValue, min: 0, max: 100 });

/** Listed in audio processing order: Distortion > Reverb > Filter. */
export const EFFECTS: readonly EffectDefinition[] = [
  {
    name: 'distortion',
    label: 'Distortion',
    parameters: [percent('amount', 'Distortion Amount', 30)],
  },
  {
    name: 'reverb',
    label: 'Reverb',
    parameters: [
      percent('roomSize', 'Room Size', 50),
      percent('mix', 'Reverb Mix', 30),
    ],
  },
  {
    name: 'filter',
    label: 'Filter',
    parameters: [
      percent('highPassFreq', 'High-Pass Frequency', 20),
      percent('highPassQ', 'High-Pass Resonance (Q)', 10),
      percent('lowPassFreq', 'Low-Pass Frequency', 80),
      percent('lowPassQ', 'Low-Pass Resonance (Q)', 10),
    ],
  },
];

export const isEffectName = (value: unknown): value is EffectName =>
  EFFECTS.some((effect) => effect.name === value);

export const getParameterDefinition = (
  effectName: string,
  parameterName: string
): ParameterDefinition | undefined =>
  EFFECTS.find((effect) => effect.name === effectName)?.parameters.find(
    (param) => param.name === parameterName
  );

export const defaultParameterValues = (): ParameterValues =>
  Object.fromEntries(
    EFFECTS.map((effect) => [
      effect.name,
      Object.fromEntries(
        effect.parameters.map((param) => [param.name, param.defaultValue])
      ),
    ])
  );

/** Returns the value clamped to the parameter range, or null if unknown/invalid. */
export const sanitizeParameter = (
  effectName: string,
  parameterName: string,
  value: unknown
): number | null => {
  const definition = getParameterDefinition(effectName, parameterName);
  if (!definition || typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }
  return Math.min(definition.max, Math.max(definition.min, value));
};

/** Merges untrusted stored values over the defaults, dropping anything invalid. */
export const mergeParameterValues = (
  base: ParameterValues,
  incoming: unknown
): ParameterValues => {
  const result: ParameterValues = structuredClone(base);
  if (!incoming || typeof incoming !== 'object') return result;

  for (const [effectName, params] of Object.entries(incoming)) {
    const target = result[effectName];
    if (!target || !params || typeof params !== 'object') continue;
    for (const [parameterName, value] of Object.entries(params)) {
      const sanitized = sanitizeParameter(effectName, parameterName, value);
      if (sanitized !== null) target[parameterName] = sanitized;
    }
  }
  return result;
};
