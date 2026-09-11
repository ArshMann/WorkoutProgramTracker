import { describe, expect, it } from 'vitest';
import { getExercise } from '@/program/exercises';
import type { Prescription } from '@/program/types';
import { incrementFor } from './increments';
import { evaluateEarned, prefill, requiresExtendedRange } from './progression';
import type { Appearance, LoggedSet } from './types';

const bench: Prescription = { exerciseId: 'barbell-bench-press', sets: 3, reps: { min: 6, max: 10 }, rir: { min: 2, max: 2 }, rest: 'main-hypertrophy' };
const squat: Prescription = { exerciseId: 'high-bar-back-squat', sets: 3, reps: { min: 6, max: 10 }, rir: { min: 2, max: 2 }, rest: 'main-hypertrophy' };
const inclineDb: Prescription = { exerciseId: 'incline-db-press', sets: 3, reps: { min: 8, max: 12 }, rir: { min: 1, max: 2 }, rest: 'secondary' };
const lateral: Prescription = { exerciseId: 'cable-lateral-raise', sets: 4, reps: { min: 12, max: 20 }, rir: { min: 0, max: 1 }, rest: 'superset' };
const ezCurl: Prescription = { exerciseId: 'ez-bar-curl', sets: 3, reps: { min: 8, max: 12 }, rir: { min: 1, max: 1 }, rest: 'isolation' };

function appearance(
  p: Prescription,
  sets: Array<[number, number, number | null]>,
  opts: Partial<Appearance> = {},
): Appearance {
  return {
    sessionId: opts.sessionId ?? 's',
    date: opts.date ?? '2026-02-01T10:00:00.000Z',
    kind: opts.kind ?? 'queue',
    repRanges: Array.from({ length: p.sets }, (_, i) => (i === p.sets - 1 && p.lastSet?.reps ? p.lastSet.reps : p.reps)),
    sets: sets.map(([load, reps, rir]): LoggedSet => ({ load, reps, rir })),
  };
}

const run = (p: Prescription, history: Appearance[], extra: Partial<Parameters<typeof prefill>[0]> = {}) => {
  const ex = getExercise(p.exerciseId);
  return prefill({ exercise: ex, prescription: p, history, incrementLb: incrementFor(ex, extra.incrementLb ?? null), ...extra });
};

describe('prefill — first appearance', () => {
  it('barbell lifts start at the empty bar, bottom of the range, target RIR', () => {
    const r = run(bench, []);
    expect(r.suggestion.kind).toBe('first');
    expect(r.sets.map((s) => [s.load, s.reps, s.rir])).toEqual([
      [45, 6, 2],
      [45, 6, 2],
      [45, 6, 2],
    ]);
  });

  it('non-barbell starts at 0 with the range default RIR (max of 1–2 → 2)', () => {
    const r = run(inclineDb, []);
    expect(r.sets[0]).toMatchObject({ load: 0, reps: 8, rir: 2 });
  });
});

describe('prefill — double progression (Part 1.4)', () => {
  it('holds load and carries last reps when the top of the range was not reached', () => {
    const r = run(bench, [appearance(bench, [[135, 9, 2], [135, 8, 2], [135, 8, 2]])]);
    expect(r.suggestion.kind).toBe('hold');
    expect(r.sets.map((s) => [s.load, s.reps])).toEqual([
      [135, 9],
      [135, 8],
      [135, 8],
    ]);
  });

  it('upper-body barbell: all sets at top of range → +5 lb, back to the bottom', () => {
    const r = run(bench, [appearance(bench, [[135, 10, 2], [135, 10, 2], [135, 10, 2]])]);
    expect(r.suggestion).toMatchObject({ kind: 'increase', deltaLb: 5 });
    expect(r.sets.map((s) => [s.load, s.reps])).toEqual([
      [140, 6],
      [140, 6],
      [140, 6],
    ]);
  });

  it('lower-body barbell: +10 lb', () => {
    const r = run(squat, [appearance(squat, [[185, 10, 2], [185, 10, 2], [185, 10, 2]])]);
    expect(r.suggestion).toMatchObject({ kind: 'increase', deltaLb: 10 });
    expect(r.sets[0].load).toBe(195);
  });

  it('one set short of the top → hold', () => {
    const r = run(bench, [appearance(bench, [[135, 10, 2], [135, 10, 2], [135, 9, 2]])]);
    expect(r.suggestion.kind).toBe('hold');
    expect(r.sets[2]).toMatchObject({ load: 135, reps: 9 });
  });

  it('hitting the reps only by going below the target RIR does not count', () => {
    const r = run(bench, [appearance(bench, [[135, 10, 2], [135, 10, 2], [135, 10, 0]])]);
    expect(r.suggestion.kind).toBe('hold');
  });

  it('a logged RIR above the target still counts (you had reps to spare)', () => {
    const r = run(bench, [appearance(bench, [[135, 10, 3], [135, 10, 2], [135, 10, 2]])]);
    expect(r.suggestion.kind).toBe('increase');
  });

  it('dumbbells need top-of-range + 2 on every set before the next pair', () => {
    const atTop = run(inclineDb, [appearance(inclineDb, [[50, 12, 2], [50, 12, 2], [50, 12, 2]])]);
    expect(atTop.suggestion.kind).toBe('hold');
    const plusTwo = run(inclineDb, [appearance(inclineDb, [[50, 14, 2], [50, 14, 2], [50, 14, 2]])]);
    expect(plusTwo.suggestion).toMatchObject({ kind: 'increase', deltaLb: 5 });
    expect(plusTwo.sets[0]).toMatchObject({ load: 55, reps: 8 });
  });

  it('isolation with a coarse increment (5 lb on a 20 lb cable) needs top + 2; a fine one does not', () => {
    expect(requiresExtendedRange(getExercise('cable-lateral-raise'), 5, 20)).toBe(true);
    expect(requiresExtendedRange(getExercise('cable-lateral-raise'), 2.5, 60)).toBe(false);
    const coarse = run(lateral, [appearance(lateral, [[20, 20, 1], [20, 20, 1], [20, 20, 1], [20, 20, 1]])]);
    expect(coarse.suggestion.kind).toBe('hold');
    const fine = run(lateral, [appearance(lateral, [[60, 20, 1], [60, 20, 1], [60, 20, 1], [60, 20, 1]])], { incrementLb: 2.5 });
    expect(fine.suggestion).toMatchObject({ kind: 'increase', deltaLb: 2.5 });
  });

  it('EZ curl at 60 lb with +5 (8 %) is a fine increment → top of range is enough', () => {
    const r = run(ezCurl, [appearance(ezCurl, [[60, 12, 1], [60, 12, 1], [60, 12, 1]])]);
    expect(r.suggestion).toMatchObject({ kind: 'increase', deltaLb: 5 });
  });

  it('per-exercise microplate increment overrides the default', () => {
    const r = run(bench, [appearance(bench, [[135, 10, 2], [135, 10, 2], [135, 10, 2]])], { incrementLb: 2.5 });
    expect(r.suggestion).toMatchObject({ kind: 'increase', deltaLb: 2.5 });
    expect(r.sets[0].load).toBe(137.5);
  });

  it('fewer sets logged than prescribed → no increase', () => {
    const r = run(bench, [appearance(bench, [[135, 10, 2], [135, 10, 2]])]);
    expect(r.suggestion.kind).toBe('hold');
  });

  it('Block 3 bench: the last set is checked against its own RIR target (1)', () => {
    const b3: Prescription = { ...bench, sets: 4, reps: { min: 4, max: 6 }, lastSet: { rir: { min: 1, max: 1 } }, rest: 'main-strength' };
    const r = run(b3, [appearance(b3, [[185, 6, 2], [185, 6, 2], [185, 6, 2], [185, 6, 1]])]);
    expect(r.suggestion.kind).toBe('increase');
    expect(r.sets[3].rir).toBe(1);
    expect(r.sets[0].rir).toBe(2);
  });
});

describe('prefill — which appearances count', () => {
  it('a deload appearance is skipped as the load base', () => {
    const r = run(bench, [
      appearance(bench, [[135, 10, 2], [135, 10, 2], [135, 10, 2]], { date: '2026-02-01T10:00:00Z' }),
      appearance(bench, [[80, 6, 4], [80, 6, 4]], { date: '2026-02-08T10:00:00Z', kind: 'deload' }),
    ]);
    expect(r.suggestion).toMatchObject({ kind: 'increase', deltaLb: 5 });
    expect(r.sets[0].load).toBe(140);
  });

  it('a minimum session provides loads but never earns an increase', () => {
    const r = run(bench, [appearance(bench, [[135, 10, 3], [135, 10, 3]], { kind: 'minimum' })]);
    expect(r.suggestion.kind).toBe('hold');
    expect(r.sets[0].load).toBe(135);
  });

  it('allowProgression=false suppresses the increase but keeps loads', () => {
    const r = run(bench, [appearance(bench, [[135, 10, 2], [135, 10, 2], [135, 10, 2]])], { allowProgression: false });
    expect(r.suggestion.kind).toBe('suppressed');
    expect(r.sets[0].load).toBe(135);
  });
});

describe('prefill — layoff and deload load factors', () => {
  const hist = [appearance(bench, [[135, 10, 2], [135, 10, 2], [135, 10, 2]], { date: '2026-02-01T10:00:00Z' })];

  it('deload: 60 % of working loads, rounded to plates, RIR 4', () => {
    const deload: Prescription = { ...bench, sets: 2, rir: { min: 4, max: 5 } };
    const r = run(deload, hist, { loadFactor: 0.6, allowProgression: false });
    expect(r.sets.map((s) => [s.load, s.rir])).toEqual([
      [80, 4],
      [80, 4],
    ]);
  });

  it('layoff −10 % applies only to appearances before the return date', () => {
    const before = run(bench, hist, { loadFactor: 0.9, loadFactorBefore: '2026-03-01T00:00:00Z', allowProgression: false });
    expect(before.sets[0].load).toBe(120);
    expect(before.suggestion.kind).toBe('suppressed');
    const after = run(bench, hist, { loadFactor: 0.9, loadFactorBefore: '2026-01-01T00:00:00Z', allowProgression: false });
    expect(after.sets[0].load).toBe(135);
  });

  it('RIR override replaces the prescribed target', () => {
    const r = run(bench, hist, { rirOverride: { min: 3, max: 4 }, allowProgression: false });
    expect(r.sets[0].rir).toBe(4);
  });

  it('assisted (negative) loads get more assistance under a reduction factor', () => {
    const pull: Prescription = { exerciseId: 'pull-up', sets: 3, reps: { min: 6, max: 10 }, rir: { min: 1, max: 2 }, rest: 'secondary' };
    const r = run(pull, [appearance(pull, [[-30, 8, 2], [-30, 8, 2], [-30, 7, 2]])], { loadFactor: 0.9, allowProgression: false });
    expect(r.sets[0].load).toBeLessThan(-30);
  });
});

describe('prefill — rep range changes between blocks', () => {
  it('entering a strength block: best recent set +6 %, bottom of the new range', () => {
    const b3: Prescription = { ...bench, sets: 4, reps: { min: 4, max: 6 }, rest: 'main-strength' };
    const r = run(b3, [appearance(bench, [[155, 9, 2], [155, 8, 2], [155, 8, 2]])]);
    expect(r.suggestion.kind).toBe('range-shift');
    expect(r.sets.length).toBe(4);
    expect(r.sets[0]).toMatchObject({ load: 165, reps: 4 });
  });

  it('leaving a strength block: load derived from e1RM for the bottom of the higher range', () => {
    const b3: Prescription = { ...bench, sets: 4, reps: { min: 4, max: 6 }, rest: 'main-strength' };
    const r = run(bench, [appearance(b3, [[185, 6, 2], [185, 6, 2], [185, 6, 2], [185, 5, 1]])]);
    expect(r.suggestion.kind).toBe('range-shift');
    expect(r.sets[0].reps).toBe(6);
    // 4×6 @ RIR 2 at 185 is the same effort as 6 @ RIR 2, so the derived load is at most 185.
    expect(r.sets[0].load).toBeGreaterThan(140);
    expect(r.sets[0].load).toBeLessThanOrEqual(185);
    expect(r.sets[0].load % 5).toBe(0);
  });

  it('a range change never awards a phantom increase from the old range', () => {
    const b3: Prescription = { ...bench, sets: 4, reps: { min: 4, max: 6 }, rest: 'main-strength' };
    const base = appearance(bench, [[135, 10, 2], [135, 10, 2], [135, 10, 2]]);
    const ex = getExercise('barbell-bench-press');
    expect(evaluateEarned(ex, base, 5, [bench.rir, bench.rir, bench.rir]).earned).toBe(true);
    const r = run(b3, [base]);
    expect(r.suggestion.kind).toBe('range-shift');
  });
});
