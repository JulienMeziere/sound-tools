import type { EffectName } from '../../../shared/effects';
import { DistortionEffect } from './DistortionEffect';
import type { Effect } from './Effect';
import { FilterEffect } from './FilterEffect';
import { ReverbEffect } from './ReverbEffect';

export type { Effect } from './Effect';

export const EFFECT_FACTORIES: Record<
  EffectName,
  (context: AudioContext) => Effect
> = {
  distortion: (context) => new DistortionEffect(context),
  reverb: (context) => new ReverbEffect(context),
  filter: (context) => new FilterEffect(context),
};
