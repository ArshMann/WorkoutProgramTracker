import { describe, expect, it } from 'vitest';
import { getBlock } from '@/program/blocks';
import { getCoreStage } from '@/program/core';
import { deloadCorePrescriptions, deloadPrescriptions, halveSets, minimumPrescriptions } from './variants';

describe('minimum session (Part 5.4)', () => {
  it('first 3 exercises, 2 sets each, RIR 3, no supersets', () => {
    const m = minimumPrescriptions(getBlock(1).sessions.PUSH);
    expect(m.map((p) => p.exerciseId)).toEqual(['barbell-bench-press', 'incline-db-press', 'seated-db-ohp']);
    for (const p of m) {
      expect(p.sets).toBe(2);
      expect(p.rir).toEqual({ min: 3, max: 3 });
      expect(p.superset).toBeUndefined();
    }
  });
});

describe('deload (Part 12)', () => {
  it('halves sets (3 → 2, 4 → 2, 2 → 1) and sets RIR 4–5', () => {
    expect(halveSets(3)).toBe(2);
    expect(halveSets(4)).toBe(2);
    expect(halveSets(2)).toBe(1);
    expect(halveSets(1)).toBe(1);
    const d = deloadPrescriptions(getBlock(3).sessions.PUSH);
    expect(d[0]).toMatchObject({ exerciseId: 'barbell-bench-press', sets: 2, rir: { min: 4, max: 5 } });
    expect(d[0].lastSet).toBeUndefined();
  });

  it('core continues at full sets; loaded drills get RIR 4–5', () => {
    const c = deloadCorePrescriptions(getCoreStage(1).drills);
    expect(c.map((p) => p.sets)).toEqual([3, 3, 2]);
    expect(c[2].rir).toEqual({ min: 4, max: 5 });
    expect(c[0].rir).toBeNull();
  });
});
