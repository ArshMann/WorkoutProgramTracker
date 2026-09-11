import type { FullBodySession } from './types';

/**
 * Part 5.6 — Full-body fallback for a known 2-session week. "Use current
 * working loads from the queue versions of each lift." Sets × reps are the
 * document's; RIR and rest are inherited from each lift's Block 1
 * prescription because 5.6 gives none.
 */
export const FULL_BODY: readonly FullBodySession[] = [
  {
    id: 'FBA',
    name: 'Full-body A',
    includeCore: false,
    exercises: [
      { exerciseId: 'barbell-bench-press', sets: 3, reps: { min: 6, max: 10 }, rir: { min: 2, max: 2 }, rest: 'main-hypertrophy' },
      { exerciseId: 'lat-pulldown', sets: 3, reps: { min: 8, max: 12 }, rir: { min: 1, max: 2 }, rest: 'secondary' },
      { exerciseId: 'high-bar-back-squat', sets: 3, reps: { min: 6, max: 10 }, rir: { min: 2, max: 2 }, rest: 'main-hypertrophy' },
      { exerciseId: 'cable-lateral-raise', sets: 3, reps: { min: 12, max: 20 }, rir: { min: 0, max: 1 }, rest: 'isolation' },
      { exerciseId: 'ez-bar-curl', sets: 2, reps: { min: 8, max: 12 }, rir: { min: 1, max: 1 }, rest: 'isolation' },
      { exerciseId: 'cable-pressdown', sets: 2, reps: { min: 12, max: 15 }, rir: { min: 0, max: 1 }, rest: 'isolation' },
      { exerciseId: 'standing-calf-raise', sets: 3, reps: { min: 8, max: 12 }, rir: { min: 0, max: 1 }, rest: 'isolation' },
    ],
  },
  {
    id: 'FBB',
    name: 'Full-body B',
    includeCore: true,
    exercises: [
      { exerciseId: 'seated-db-ohp', sets: 3, reps: { min: 8, max: 12 }, rir: { min: 1, max: 2 }, rest: 'secondary' },
      { exerciseId: 'chest-supported-row', sets: 3, reps: { min: 8, max: 12 }, rir: { min: 1, max: 2 }, rest: 'secondary' },
      { exerciseId: 'romanian-deadlift', sets: 3, reps: { min: 6, max: 10 }, rir: { min: 2, max: 2 }, rest: 'main-hypertrophy' },
      { exerciseId: 'seated-leg-curl', sets: 3, reps: { min: 10, max: 15 }, rir: { min: 0, max: 1 }, rest: 'isolation' },
      { exerciseId: 'reverse-pec-deck', sets: 3, reps: { min: 12, max: 20 }, rir: { min: 0, max: 1 }, rest: 'isolation' },
      { exerciseId: 'hammer-curl', sets: 2, reps: { min: 10, max: 15 }, rir: { min: 0, max: 1 }, rest: 'isolation' },
      { exerciseId: 'seated-calf-raise', sets: 3, reps: { min: 10, max: 15 }, rir: { min: 0, max: 1 }, rest: 'isolation' },
      // + Core block (current stage), appended by the session builder.
    ],
  },
];

export function getFullBody(id: 'FBA' | 'FBB'): FullBodySession {
  const s = FULL_BODY.find((x) => x.id === id);
  if (!s) throw new Error(`No full-body session ${id}`);
  return s;
}
