import { describe, expect, it } from 'vitest';
import { DEFAULT_REST_SETTINGS } from './rest';
import { layoffEffect } from './layoff';
import { buildSession, replaceExercise, type BuildContext } from './session-builder';
import type { Appearance } from './types';

const START = '2026-01-05';

function ctx(overrides: Partial<BuildContext> = {}): BuildContext {
  return {
    now: new Date(2026, 0, 30), // week 4 of block 1
    startDayKey: START,
    historyByExercise: {},
    customIncrements: {},
    restSettings: DEFAULT_REST_SETTINGS,
    layoff: layoffEffect('none', 2),
    activeLayoff: null,
    manualDeload: false,
    slotOverrides: {},
    ...overrides,
  };
}

const app = (exerciseId: string, sets: Array<[number, number, number]>, date = '2026-01-27T10:00:00.000Z'): Appearance => ({
  sessionId: 'x',
  date,
  kind: 'queue',
  repRanges: sets.map(() => ({ min: 6, max: 10 })),
  sets: sets.map(([load, reps, rir]) => ({ load, reps, rir })),
});

describe('buildSession — the queue session', () => {
  it('Block 1 PUSH: 5 cards, supersets interleaved with the shortened rest', () => {
    const s = buildSession(ctx(), 0, 'queue');
    expect(s.kind).toBe('queue');
    expect(s.sessionType).toBe('PUSH');
    expect(s.block).toBe(1);
    expect(s.week).toBe(4);
    expect(s.cards.map((c) => c.title)).toEqual([
      'Barbell bench press',
      'Incline DB press (~30°)',
      'Seated DB overhead press',
      'Cable fly (mid-height)  +  Cable lateral raise',
      'Overhead cable triceps extension  +  Cable pressdown',
    ]);
    const ss = s.cards[3];
    expect(ss.isSuperset).toBe(true);
    expect(ss.rows.map((r) => `${r.exerciseId === 'cable-fly' ? 'A' : 'B'}${r.setIndex + 1}`)).toEqual(['A1', 'B1', 'A2', 'B2', 'B3', 'B4']);
    expect(ss.rows.slice(0, 3).every((r) => r.restCategory === 'superset' && r.restSeconds === 60)).toBe(true);
    // After the fly lane is exhausted the remaining lateral raises rest as isolation.
    expect(ss.rows[4].restCategory).toBe('isolation');
    expect(s.cards[0].rows[0].restSeconds).toBe(180);
    expect(s.banner).toBeNull();
    expect(s.advancesQueue).toBe(true);
  });

  it('Block 1 LEGS appends the core block, supersetted with seated calf raise', () => {
    const s = buildSession(ctx(), 2, 'queue');
    expect(s.sessionType).toBe('LEGS');
    const last = s.cards[s.cards.length - 1];
    expect(last.isCoreBlock).toBe(true);
    expect(last.title).toBe('Seated calf raise  +  Core/APT block — Stage 1');
    expect(last.rows.slice(0, 6).map((r) => r.exerciseId)).toEqual([
      'seated-calf-raise',
      'dead-bug',
      'seated-calf-raise',
      'dead-bug',
      'seated-calf-raise',
      'dead-bug',
    ]);
    expect(last.rows.filter((r) => r.exerciseId === 'cable-crunch').length).toBe(2);
    const deadBug = last.rows.find((r) => r.exerciseId === 'dead-bug')!;
    expect(deadBug.loadable).toBe(false);
    expect(deadBug.rir).toBeNull();
    expect(deadBug.perSide).toBe(true);
  });

  it('Block 2 LEGS core block is its own card (no SS in Block 2)', () => {
    const s = buildSession(ctx({ now: new Date(2026, 2, 20) }), 2, 'queue');
    expect(s.block).toBe(2);
    const last = s.cards[s.cards.length - 1];
    expect(last.title).toBe('Core/APT block — Stage 2');
    expect(last.isSuperset).toBe(false);
  });

  it('prefills from history and marks the suggestion', () => {
    const c = ctx({
      historyByExercise: { 'barbell-bench-press': [app('barbell-bench-press', [[135, 10, 2], [135, 10, 2], [135, 10, 2]])] },
    });
    const s = buildSession(c, 0, 'queue');
    expect(s.cards[0].exercises[0].suggestion.kind).toBe('increase');
    expect(s.cards[0].rows.map((r) => r.load)).toEqual([140, 140, 140]);
  });

  it('on-ramp week 1 overrides every RIR to 4 (3–4) with a banner', () => {
    const s = buildSession(ctx({ now: new Date(2026, 0, 6) }), 0, 'queue');
    expect(s.week).toBe(1);
    expect(s.banner).toContain('On-ramp week 1');
    expect(s.cards.flatMap((c) => c.rows).every((r) => r.rir === 4)).toBe(true);
  });

  it('week 9 auto-engages the deload: half sets, 60 % loads, RIR 4, no calibration', () => {
    const c = ctx({
      now: new Date(2026, 2, 3), // week 9
      historyByExercise: { 'barbell-bench-press': [app('barbell-bench-press', [[135, 10, 2], [135, 10, 2], [135, 10, 2]])] },
    });
    const s = buildSession(c, 0, 'queue');
    expect(s.kind).toBe('deload');
    expect(s.banner).toContain('Deload week 9');
    expect(s.cards[0].rows.length).toBe(2);
    expect(s.cards[0].rows[0]).toMatchObject({ load: 80, rir: 4 });
    expect(s.cards.flatMap((x) => x.rows).some((r) => r.calibrationEligible)).toBe(false);
    expect(s.countsForProgression).toBe(false);
  });

  it('calibration eligibility lands only on the last set of machine/cable isolation', () => {
    const s = buildSession(ctx(), 0, 'queue');
    const eligible = s.cards.flatMap((c) => c.rows).filter((r) => r.calibrationEligible);
    expect(eligible.every((r) => r.isLastSet)).toBe(true);
    expect(new Set(eligible.map((r) => r.exerciseId))).toEqual(
      new Set(['cable-fly', 'cable-lateral-raise', 'overhead-cable-triceps-extension', 'cable-pressdown']),
    );
  });

  it('first week of Block 3 puts main lifts at RIR 3', () => {
    const s = buildSession(ctx({ now: new Date(2026, 4, 5) }), 0, 'queue'); // week 18
    expect(s.week).toBe(18);
    expect(s.banner).toContain('strength block');
    expect(s.cards[0].rows[0].rir).toBe(3); // bench
    expect(s.cards[2].rows[0].rir).toBe(1); // incline DB stays at its own RIR 1
  });
});

describe('buildSession — variants', () => {
  it('minimum: first 3 exercises, 2 sets, RIR 3, advances the queue, no core', () => {
    const s = buildSession(ctx(), 2, 'minimum');
    expect(s.kind).toBe('minimum');
    expect(s.cards.map((c) => c.exercises[0].exerciseId)).toEqual(['high-bar-back-squat', 'romanian-deadlift', 'leg-press']);
    expect(s.cards.every((c) => c.rows.length === 2 && c.rows.every((r) => r.rir === 3))).toBe(true);
    expect(s.advancesQueue).toBe(true);
    expect(s.countsForProgression).toBe(false);
    expect(s.banner).toContain('Counts as the queued session');
  });

  it('manual deload outside a deload week is labelled unscheduled', () => {
    const s = buildSession(ctx(), 0, 'deload');
    expect(s.kind).toBe('deload');
    expect(s.banner).toContain('Unscheduled deload');
  });

  it('full-body B uses queue loads, appends the core block, and does not advance the queue', () => {
    const c = ctx({ historyByExercise: { 'romanian-deadlift': [app('romanian-deadlift', [[185, 8, 2], [185, 8, 2], [185, 8, 2]])] } });
    const s = buildSession(c, 1, 'FBB');
    expect(s.kind).toBe('fullbody');
    expect(s.sessionType).toBe('FBB');
    expect(s.advancesQueue).toBe(false);
    const rdl = s.cards.find((x) => x.exercises[0].exerciseId === 'romanian-deadlift')!;
    expect(rdl.rows.map((r) => r.load)).toEqual([185, 185, 185]);
    expect(s.cards[s.cards.length - 1].isCoreBlock).toBe(true);
  });

  it('full-body A has no core block', () => {
    const s = buildSession(ctx(), 1, 'FBA');
    expect(s.cards.some((c) => c.isCoreBlock)).toBe(false);
    expect(s.cards.length).toBe(7);
  });
});

describe('buildSession — layoff handling', () => {
  const hist = { 'barbell-bench-press': [app('barbell-bench-press', [[135, 10, 2], [135, 10, 2], [135, 10, 2]], '2026-01-05T10:00:00.000Z')] };

  it('~1 week: same loads, no progression, one line of copy', () => {
    const s = buildSession(ctx({ historyByExercise: hist, layoff: layoffEffect('week', 8) }), 0, 'queue');
    expect(s.banner).toContain('8 days');
    expect(s.cards[0].rows[0].load).toBe(135);
    expect(s.cards[0].exercises[0].suggestion.kind).toBe('suppressed');
  });

  it('2–3 weeks: −10 % and RIR 2–3 (chip 3)', () => {
    const s = buildSession(ctx({ historyByExercise: hist, layoff: layoffEffect('two-to-three-weeks', 18) }), 0, 'queue');
    expect(s.banner).toContain('−10 %');
    expect(s.cards[0].rows[0]).toMatchObject({ load: 120, rir: 3 });
  });

  it('a running return loop keeps the override for later sessions but only reduces loads logged before the return', () => {
    const later = {
      ...hist,
      'incline-db-press': [app('incline-db-press', [[45, 10, 2], [45, 10, 2], [45, 10, 2]], '2026-01-29T10:00:00.000Z')],
    };
    const s = buildSession(
      ctx({
        historyByExercise: later,
        activeLayoff: { resumedAt: '2026-01-28T00:00:00.000Z', loadFactor: 0.9, rirOverride: { min: 2, max: 3 }, sessionsRemaining: 2, copy: null },
      }),
      0,
      'queue',
    );
    expect(s.banner).toContain('Return loop');
    expect(s.cards[0].rows[0].load).toBe(120); // bench: last logged before the return → −10 %
    expect(s.cards[1].rows[0].load).toBe(45); // incline: already logged after the return → unchanged
    expect(s.cards[1].rows[0].rir).toBe(3);
  });
});

describe('replaceExercise — substitutions (Part 3)', () => {
  it('swaps a slot for a substitute planned from its own history; the original is untouched', () => {
    const c = ctx({
      historyByExercise: {
        'barbell-bench-press': [app('barbell-bench-press', [[135, 10, 2], [135, 10, 2], [135, 10, 2]])],
        'machine-chest-press': [app('machine-chest-press', [[100, 8, 2], [100, 8, 2], [100, 8, 2]])],
      },
    });
    const s = buildSession(c, 0, 'queue');
    const swapped = replaceExercise(s, c, 0, 0, 'machine-chest-press', false);
    const ex = swapped.cards[0].exercises[0];
    expect(ex.exerciseId).toBe('machine-chest-press');
    expect(ex.substitutedFrom).toBe('barbell-bench-press');
    expect(swapped.cards[0].rows.map((r) => r.load)).toEqual([100, 100, 100]);
    expect(swapped.cards[0].rows[0].exerciseId).toBe('machine-chest-press');
    // Other cards are untouched.
    expect(swapped.cards[1]).toBe(s.cards[1]);
  });

  it('joint fallback: −20 %, 10–15 reps, RIR 2', () => {
    const c = ctx({ historyByExercise: { 'machine-chest-press': [app('machine-chest-press', [[100, 8, 2], [100, 8, 2], [100, 8, 2]])] } });
    const s = buildSession(c, 0, 'queue');
    const swapped = replaceExercise(s, c, 0, 0, 'machine-chest-press', true);
    const ex = swapped.cards[0].exercises[0];
    expect(ex.jointFallback).toBe(true);
    expect(ex.prescription.reps).toEqual({ min: 10, max: 15 });
    expect(swapped.cards[0].rows[0]).toMatchObject({ load: 80, rir: 2, reps: 10 });
  });

  it('swapping one half of a superset keeps the interleave and the partner’s numbers', () => {
    const s = buildSession(ctx(), 0, 'queue');
    const swapped = replaceExercise(s, ctx(), 3, 3, 'db-fly-incline', false);
    const card = swapped.cards[3];
    expect(card.exercises.map((e) => e.exerciseId)).toEqual(['db-fly-incline', 'cable-lateral-raise']);
    expect(card.rows.map((r) => r.exerciseId)).toEqual([
      'db-fly-incline',
      'cable-lateral-raise',
      'db-fly-incline',
      'cable-lateral-raise',
      'cable-lateral-raise',
      'cable-lateral-raise',
    ]);
  });
});
