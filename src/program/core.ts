import type { CoreStage } from './types';

/**
 * Part 7 — Core & anterior pelvic tilt protocol. Appended to every LEGS
 * session. Stage is selected by block: 1 → B1, 2 → B2, 3 → B3, 4 → B4–6.
 *
 * Bracing drills have no RIR in the document ("—") and no load. Cable crunch
 * is the one loaded drill and progresses under rule 1.4 like any isolation.
 */
export const CORE_STAGES: readonly CoreStage[] = [
  {
    stage: 1,
    label: 'Core/APT block — Stage 1',
    drills: [
      {
        exerciseId: 'dead-bug',
        sets: 3,
        reps: { min: 8, max: 8 },
        rir: null,
        rest: 'isolation',
        progression: 'log-only',
        notes: 'Per side. Lower back pressed flat — this is the exercise.',
      },
      {
        exerciseId: 'rkc-plank',
        sets: 3,
        reps: { min: 15, max: 20 },
        rir: null,
        rest: 'isolation',
        progression: 'log-only',
        notes: 'Seconds. Max tension, glutes squeezed, posterior tilt.',
      },
      {
        exerciseId: 'cable-crunch',
        sets: 2,
        reps: { min: 10, max: 15 },
        rir: { min: 1, max: 1 },
        rest: 'isolation',
        progression: 'double',
        notes: 'Progress load per rule 1.4.',
      },
    ],
  },
  {
    stage: 2,
    label: 'Core/APT block — Stage 2',
    drills: [
      {
        exerciseId: 'hanging-knee-raise',
        sets: 3,
        reps: { min: 8, max: 12 },
        rir: null,
        rest: 'isolation',
        progression: 'log-only',
        notes: "Curl the pelvis, don't swing.",
      },
      {
        exerciseId: 'side-plank',
        sets: 2,
        reps: { min: 20, max: 30 },
        rir: null,
        rest: 'isolation',
        progression: 'log-only',
        notes: 'Seconds per side.',
      },
      {
        exerciseId: 'cable-crunch',
        sets: 2,
        reps: { min: 10, max: 15 },
        rir: { min: 1, max: 1 },
        rest: 'isolation',
        progression: 'double',
        notes: 'Keep progressing.',
      },
    ],
  },
  {
    stage: 3,
    label: 'Core/APT block — Stage 3',
    drills: [
      {
        exerciseId: 'hanging-leg-raise-progression',
        sets: 3,
        reps: { min: 6, max: 10 },
        rir: null,
        rest: 'isolation',
        progression: 'log-only',
      },
      {
        exerciseId: 'ab-wheel-knees',
        sets: 3,
        reps: { min: 6, max: 10 },
        rir: null,
        rest: 'isolation',
        progression: 'log-only',
      },
      {
        exerciseId: 'suitcase-carry',
        sets: 2,
        reps: { min: 30, max: 30 },
        rir: null,
        rest: 'isolation',
        progression: 'log-only',
        notes: 'Metres per side.',
      },
    ],
  },
  {
    stage: 4,
    label: 'Core/APT block — Stage 4',
    drills: [
      {
        exerciseId: 'hanging-leg-raise',
        sets: 3,
        reps: { min: 8, max: 12 },
        rir: null,
        rest: 'isolation',
        progression: 'log-only',
      },
      {
        exerciseId: 'ab-wheel-extended',
        sets: 3,
        reps: { min: 5, max: 8 },
        rir: null,
        rest: 'isolation',
        progression: 'log-only',
      },
      {
        exerciseId: 'cable-crunch',
        sets: 2,
        reps: { min: 10, max: 15 },
        rir: { min: 1, max: 1 },
        rest: 'isolation',
        progression: 'double',
      },
      {
        exerciseId: 'suitcase-carry',
        sets: 2,
        reps: { min: 40, max: 40 },
        rir: null,
        rest: 'isolation',
        progression: 'log-only',
        notes: 'Metres per side.',
      },
    ],
  },
];

export function getCoreStage(stage: 1 | 2 | 3 | 4): CoreStage {
  const found = CORE_STAGES.find((s) => s.stage === stage);
  if (!found) throw new Error(`No core stage ${stage}`);
  return found;
}
