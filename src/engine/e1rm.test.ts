import { describe, expect, it } from 'vitest';
import { bestE1rm, e1rm, loadForReps } from './e1rm';

describe('estimated 1RM', () => {
  it('Epley with RIR folded into reps', () => {
    expect(e1rm(100, 1, 0)).toBe(100);
    expect(e1rm(100, 10, 0)).toBeCloseTo(133.33, 1);
    expect(e1rm(100, 8, 2)).toBeCloseTo(133.33, 1);
    expect(e1rm(0, 10, 0)).toBe(0);
  });

  it('inverse round-trips', () => {
    const one = e1rm(185, 6, 2);
    expect(loadForReps(one, 6, 2)).toBeCloseTo(185, 6);
  });

  it('best of a set list', () => {
    expect(
      bestE1rm([
        { load: 135, reps: 10, rir: 2 },
        { load: 135, reps: 8, rir: 2 },
      ]),
    ).toBeCloseTo(e1rm(135, 10, 2), 6);
  });
});
