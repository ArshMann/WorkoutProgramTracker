import { describe, expect, it } from 'vitest';
import { classifyLayoff, layoffEffect } from './layoff';

describe('layoff matrix (Part 5)', () => {
  it('classifies the gap since the last session', () => {
    expect(classifyLayoff(null)).toBe('none');
    expect(classifyLayoff(0)).toBe('none');
    expect(classifyLayoff(1)).toBe('none');
    expect(classifyLayoff(3)).toBe('none');
    expect(classifyLayoff(4)).toBe('none'); // "miss 2–3 days" = 3–4 days since the last session
    expect(classifyLayoff(5)).toBe('week');
    expect(classifyLayoff(7)).toBe('week');
    expect(classifyLayoff(13)).toBe('week');
    expect(classifyLayoff(14)).toBe('two-to-three-weeks');
    expect(classifyLayoff(27)).toBe('two-to-three-weeks');
    expect(classifyLayoff(28)).toBe('four-plus-weeks');
    expect(classifyLayoff(90)).toBe('four-plus-weeks');
  });

  it('1–4 days since the last session: nothing', () => {
    const e = layoffEffect('none', 2);
    expect(e).toMatchObject({ loadFactor: 1, rirOverride: null, suppressProgression: false, restartBlock: false, copy: null });
  });

  it('~1 week: same loads, no progression, this session only', () => {
    const e = layoffEffect('week', 8);
    expect(e).toMatchObject({ loadFactor: 1, suppressProgression: true, sessionsRemaining: 1, restartBlock: false });
    expect(e.copy).toContain('no progression');
  });

  it('2–3 weeks: −10 %, RIR 2–3 for one full loop', () => {
    const e = layoffEffect('two-to-three-weeks', 18);
    expect(e).toMatchObject({ loadFactor: 0.9, rirOverride: { min: 2, max: 3 }, sessionsRemaining: 3, restartBlock: false });
  });

  it('4+ weeks: restart block at week 1, −15 %, on-ramp RIR 3–4', () => {
    const e = layoffEffect('four-plus-weeks', 35);
    expect(e).toMatchObject({ loadFactor: 0.85, rirOverride: { min: 3, max: 4 }, restartBlock: true });
    expect(e.copy).toContain('restarted');
  });
});
