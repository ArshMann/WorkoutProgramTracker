import { DEFAULT_INCREMENT_LB } from '@/program/decisions';
import type { ExerciseDef } from '@/program/types';

/**
 * Part 1.4 increments. Priority: per-exercise custom increment (microplates,
 * a machine's smallest pin) → the exercise's own default → the equipment
 * default.
 */
export function incrementFor(exercise: ExerciseDef, customIncrementLb: number | null | undefined): number {
  if (customIncrementLb && customIncrementLb > 0) return customIncrementLb;
  if (exercise.defaultIncrementLb) return exercise.defaultIncrementLb;
  return DEFAULT_INCREMENT_LB[exercise.equipment];
}

/** Round to the nearest multiple of `inc` (0 → returns load unchanged). */
export function roundToIncrement(load: number, inc: number): number {
  if (inc <= 0) return load;
  return Math.round(load / inc) * inc;
}

export function floorToIncrement(load: number, inc: number): number {
  if (inc <= 0) return load;
  return Math.floor(load / inc + 1e-9) * inc;
}

/** Barbell loads are rounded to what plates allow: 5 lb, or the custom increment when it is finer. */
export function plateRounding(exercise: ExerciseDef, inc: number): number {
  if (exercise.equipment === 'barbell-lower' || exercise.equipment === 'barbell-upper') {
    return Math.min(5, inc);
  }
  return inc;
}
