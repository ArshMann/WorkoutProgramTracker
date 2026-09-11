import { describe, expect, it } from 'vitest';
import { detectStall, isLoadTooHeavy, isMultiStall, stallStep } from './stall';
import type { Appearance } from './types';

const app = (date: string, sets: Array<[number, number]>, kind: Appearance['kind'] = 'queue'): Appearance => ({
  sessionId: date,
  date,
  kind,
  repRanges: sets.map(() => ({ min: 6, max: 10 })),
  sets: sets.map(([load, reps]) => ({ load, reps, rir: 2 })),
});

describe('stall detection (Part 11 trigger)', () => {
  it('three consecutive appearances with zero reps added at the same load → stall', () => {
    const h = [
      app('2026-02-01', [[135, 8], [135, 8], [135, 7]]),
      app('2026-02-04', [[135, 8], [135, 8], [135, 7]]),
      app('2026-02-07', [[135, 8], [135, 7], [135, 8]]),
      app('2026-02-10', [[135, 8], [135, 8], [135, 7]]),
    ];
    const r = detectStall(h);
    expect(r.stalled).toBe(true);
    expect(r.noGainRun).toBe(3);
    expect(r.since).toBe('2026-02-04');
  });

  it('two no-gain appearances is not yet a stall', () => {
    const h = [
      app('2026-02-01', [[135, 8], [135, 8], [135, 7]]),
      app('2026-02-04', [[135, 8], [135, 8], [135, 7]]),
      app('2026-02-07', [[135, 8], [135, 8], [135, 7]]),
    ];
    expect(detectStall(h)).toMatchObject({ stalled: false, noGainRun: 2 });
  });

  it('adding a single rep anywhere resets the run', () => {
    const h = [
      app('2026-02-01', [[135, 8], [135, 8], [135, 7]]),
      app('2026-02-04', [[135, 8], [135, 8], [135, 7]]),
      app('2026-02-07', [[135, 8], [135, 8], [135, 8]]),
      app('2026-02-10', [[135, 8], [135, 8], [135, 8]]),
    ];
    expect(detectStall(h)).toMatchObject({ stalled: false, noGainRun: 1 });
  });

  it('a load change (either direction) starts a new baseline', () => {
    const h = [
      app('2026-02-01', [[135, 10], [135, 10], [135, 10]]),
      app('2026-02-04', [[140, 6], [140, 6], [140, 6]]),
      app('2026-02-07', [[140, 6], [140, 6], [140, 6]]),
      app('2026-02-10', [[125, 8], [125, 8], [125, 8]]),
      app('2026-02-13', [[125, 8], [125, 8], [125, 8]]),
    ];
    expect(detectStall(h)).toMatchObject({ stalled: false, noGainRun: 1 });
  });

  it('minimum and deload sessions are not attempts and are ignored', () => {
    const h = [
      app('2026-02-01', [[135, 8], [135, 8], [135, 7]]),
      app('2026-02-04', [[135, 8], [135, 8]], 'minimum'),
      app('2026-02-07', [[135, 8], [135, 8], [135, 7]]),
      app('2026-02-10', [[80, 6], [80, 6]], 'deload'),
      app('2026-02-13', [[135, 8], [135, 8], [135, 7]]),
      app('2026-02-16', [[135, 8], [135, 8], [135, 7]]),
    ];
    expect(detectStall(h)).toMatchObject({ stalled: true, noGainRun: 3 });
  });

  it('protocol advances one step per week, capped at 6', () => {
    const flagged = new Date(2026, 1, 10);
    expect(stallStep(flagged, new Date(2026, 1, 10))).toBe(1);
    expect(stallStep(flagged, new Date(2026, 1, 16))).toBe(1);
    expect(stallStep(flagged, new Date(2026, 1, 17))).toBe(2);
    expect(stallStep(flagged, new Date(2026, 2, 3))).toBe(4);
    expect(stallStep(flagged, new Date(2026, 6, 1))).toBe(6);
  });

  it('three or more simultaneous stalls is a fatigue problem (step 7)', () => {
    expect(isMultiStall(2)).toBe(false);
    expect(isMultiStall(3)).toBe(true);
  });
});

describe('load too heavy (D18) — not a stall', () => {
  const heavy = (date: string, rir: number): Appearance => ({
    sessionId: date,
    date,
    kind: 'queue',
    repRanges: [{ min: 6, max: 10 }, { min: 6, max: 10 }, { min: 6, max: 10 }],
    rirTargets: [{ min: 2, max: 2 }, { min: 2, max: 2 }, { min: 2, max: 2 }],
    sets: [
      { load: 135, reps: 10, rir },
      { load: 135, reps: 10, rir },
      { load: 135, reps: 10, rir },
    ],
  });

  it('three appearances at the top of the range but below the target RIR', () => {
    const h = [heavy('2026-02-01', 0), heavy('2026-02-04', 1), heavy('2026-02-07', 0)];
    expect(isLoadTooHeavy(h)).toBe(true);
    // The same history also reads as a stall to the rep counter; the copy must prefer the heavy diagnosis.
    expect(detectStall([heavy('2026-01-29', 0), ...h]).stalled).toBe(true);
  });

  it('an appearance at the target RIR breaks the pattern', () => {
    expect(isLoadTooHeavy([heavy('2026-02-01', 0), heavy('2026-02-04', 2), heavy('2026-02-07', 0)])).toBe(false);
  });

  it('needs three appearances and stored RIR targets', () => {
    expect(isLoadTooHeavy([heavy('2026-02-01', 0), heavy('2026-02-04', 0)])).toBe(false);
    const noTargets = { ...heavy('2026-02-07', 0), rirTargets: undefined };
    expect(isLoadTooHeavy([heavy('2026-02-01', 0), heavy('2026-02-04', 0), noTargets])).toBe(false);
  });
});
