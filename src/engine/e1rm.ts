/**
 * Estimated 1RM (Epley), RIR-adjusted: a set of `reps` at `rir` reps in
 * reserve is treated as a set of `reps + rir` to failure.
 */
export function e1rm(load: number, reps: number, rir: number | null = 0): number {
  const effectiveReps = reps + Math.max(0, rir ?? 0);
  if (effectiveReps <= 0 || load <= 0) return 0;
  if (effectiveReps === 1) return load;
  return load * (1 + effectiveReps / 30);
}

/** Load that would give `reps` at `rir` for a given e1RM (inverse Epley). */
export function loadForReps(oneRm: number, reps: number, rir: number = 0): number {
  const effectiveReps = reps + Math.max(0, rir);
  if (effectiveReps <= 1) return oneRm;
  return oneRm / (1 + effectiveReps / 30);
}

export function bestE1rm(sets: ReadonlyArray<{ load: number; reps: number; rir: number | null }>): number {
  return sets.reduce((best, s) => Math.max(best, e1rm(s.load, s.reps, s.rir)), 0);
}
