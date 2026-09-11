import { describe, expect, it } from 'vitest';
import { getBlock } from '@/program/blocks';
import { isDeloadWeek, onRampRir, programWeek, startDateForBlockRestart, strengthEntryRir, weekInfo } from './week';

const start = '2026-01-05';

describe('program week', () => {
  it('advances on elapsed time, week 1 = days 0–6', () => {
    expect(programWeek(start, new Date(2026, 0, 5))).toBe(1);
    expect(programWeek(start, new Date(2026, 0, 11, 23, 59))).toBe(1);
    expect(programWeek(start, new Date(2026, 0, 12))).toBe(2);
    expect(programWeek(start, new Date(2026, 2, 9))).toBe(10);
  });

  it('clamps at 52', () => {
    expect(programWeek(start, new Date(2028, 0, 1))).toBe(52);
  });

  it('before the start date is week 1', () => {
    expect(programWeek(start, new Date(2025, 11, 25))).toBe(1);
  });

  it('labels the week with block and emphasis', () => {
    const info = weekInfo(start, new Date(2026, 2, 23)); // week 12
    expect(info.week).toBe(12);
    expect(info.label).toBe('Week 12 · Block 2 · Hypertrophy 2');
    expect(info.isDeload).toBe(false);
  });

  it('deload weeks', () => {
    expect([9, 17, 26, 35, 43, 52].every(isDeloadWeek)).toBe(true);
    expect(isDeloadWeek(8)).toBe(false);
    expect(isDeloadWeek(10)).toBe(false);
  });

  it('on-ramp RIR 3–4 / 3 / 2–3 then null', () => {
    expect(onRampRir(1)).toEqual({ min: 3, max: 4 });
    expect(onRampRir(2)).toEqual({ min: 3, max: 3 });
    expect(onRampRir(3)).toEqual({ min: 2, max: 3 });
    expect(onRampRir(4)).toBeNull();
  });

  it('strength blocks run their first week at RIR 3 on main lifts', () => {
    expect(strengthEntryRir(getBlock(3), 18)).toEqual({ min: 3, max: 3 });
    expect(strengthEntryRir(getBlock(3), 19)).toBeNull();
    expect(strengthEntryRir(getBlock(5), 36)).toEqual({ min: 3, max: 3 });
    expect(strengthEntryRir(getBlock(2), 10)).toBeNull();
  });

  it('block restart picks a start date that puts today in the block’s first week', () => {
    const now = new Date(2026, 5, 20); // some day in block 3
    const newStart = startDateForBlockRestart(getBlock(3), now);
    expect(programWeek(newStart, now)).toBe(18);
    expect(programWeek(newStart, new Date(2026, 5, 27))).toBe(19);
  });
});
