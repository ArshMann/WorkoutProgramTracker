import { REST_SECONDS_DEFAULT } from '@/program/decisions';
import type { BlockEmphasis, ExerciseDef, RestCategory } from '@/program/types';

export type RestSettings = Record<RestCategory, number>;

export const DEFAULT_REST_SETTINGS: RestSettings = { ...REST_SECONDS_DEFAULT };

export function restSeconds(category: RestCategory, settings: RestSettings = DEFAULT_REST_SETTINGS): number {
  return settings[category] ?? REST_SECONDS_DEFAULT[category];
}

/** Rest category an exercise falls into on its own (outside a superset), per Part 1.6. */
export function roleRest(exercise: ExerciseDef, emphasis: BlockEmphasis): RestCategory {
  switch (exercise.role) {
    case 'main':
      return emphasis === 'strength' ? 'main-strength' : 'main-hypertrophy';
    case 'secondary':
      return 'secondary';
    default:
      return 'isolation';
  }
}

export function formatSeconds(total: number): string {
  const s = Math.max(0, Math.round(total));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}
