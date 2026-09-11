import { describe, expect, it } from 'vitest';
import { interleave } from './supersets';

describe('superset interleave', () => {
  it('A1 B1 A2 B2 then the longer lane finishes', () => {
    expect(interleave([2, 4])).toEqual([
      { lane: 0, index: 0 },
      { lane: 1, index: 0 },
      { lane: 0, index: 1 },
      { lane: 1, index: 1 },
      { lane: 1, index: 2 },
      { lane: 1, index: 3 },
    ]);
  });

  it('single lane is sequential', () => {
    expect(interleave([3]).map((r) => r.index)).toEqual([0, 1, 2]);
  });

  it('empty lanes are skipped', () => {
    expect(interleave([0, 2])).toEqual([
      { lane: 1, index: 0 },
      { lane: 1, index: 1 },
    ]);
  });
});
