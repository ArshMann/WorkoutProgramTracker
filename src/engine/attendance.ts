import { addDays, daysBetween, parseDayKey, startOfDay } from './dates';

/**
 * Sessions attended per week — a count, never a streak. Weeks are the
 * program's own weeks (aligned to the start date), so "this week" is the
 * same week the Home card names.
 */

export function programWeekStart(startDayKey: string, now: Date): Date {
  const start = parseDayKey(startDayKey);
  const days = Math.max(0, daysBetween(start, now));
  return addDays(start, Math.floor(days / 7) * 7);
}

export function sessionsInProgramWeek(sessionDates: readonly Date[], startDayKey: string, now: Date): number {
  const ws = programWeekStart(startDayKey, now);
  const we = addDays(ws, 7);
  return sessionDates.filter((d) => d >= ws && d < we).length;
}

/** Sessions in the previous `weeks` × 7 days (today inclusive), divided by `weeks`. */
export function rollingWeeklyAverage(sessionDates: readonly Date[], now: Date, weeks = 4): number {
  const end = addDays(startOfDay(now), 1);
  const begin = addDays(end, -7 * weeks);
  const n = sessionDates.filter((d) => d >= begin && d < end).length;
  return Math.round((n / weeks) * 10) / 10;
}

/** Average sessions per week between two dates (inclusive of from, exclusive of to). */
export function averagePerWeek(sessionDates: readonly Date[], from: Date, to: Date): number {
  const days = Math.max(1, daysBetween(from, to));
  const n = sessionDates.filter((d) => d >= from && d < to).length;
  return Math.round((n / (days / 7)) * 10) / 10;
}
