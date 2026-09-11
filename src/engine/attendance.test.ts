import { describe, expect, it } from 'vitest';
import { averagePerWeek, programWeekStart, rollingWeeklyAverage, sessionsInProgramWeek } from './attendance';

const START = '2026-01-05'; // a Monday

describe('attendance — a count, never a streak', () => {
  const sessions = [
    new Date(2026, 0, 6),
    new Date(2026, 0, 8),
    new Date(2026, 0, 10),
    new Date(2026, 0, 13),
    new Date(2026, 0, 15),
    new Date(2026, 0, 20),
    new Date(2026, 0, 27),
    new Date(2026, 0, 29),
    new Date(2026, 0, 31),
  ];

  it('program week starts are aligned to the start date', () => {
    expect(programWeekStart(START, new Date(2026, 0, 11))).toEqual(new Date(2026, 0, 5));
    expect(programWeekStart(START, new Date(2026, 0, 12))).toEqual(new Date(2026, 0, 12));
  });

  it('counts sessions in the current program week', () => {
    expect(sessionsInProgramWeek(sessions, START, new Date(2026, 0, 11))).toBe(3);
    expect(sessionsInProgramWeek(sessions, START, new Date(2026, 0, 18))).toBe(2);
    expect(sessionsInProgramWeek(sessions, START, new Date(2026, 0, 25))).toBe(1);
    expect(sessionsInProgramWeek(sessions, START, new Date(2026, 1, 1))).toBe(3);
  });

  it('4-week rolling average', () => {
    expect(rollingWeeklyAverage(sessions, new Date(2026, 1, 1))).toBe(2.3); // 9 sessions / 4 weeks, one decimal
    expect(rollingWeeklyAverage([], new Date(2026, 1, 1))).toBe(0);
  });

  it('average per week over a block', () => {
    expect(averagePerWeek(sessions, new Date(2026, 0, 5), new Date(2026, 1, 2))).toBe(2.3);
  });
});
