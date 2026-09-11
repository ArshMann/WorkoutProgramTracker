import { blockForWeek, DELOAD_WEEKS } from '@/program/blocks';
import { CLAMP_WEEK_AT_52 } from '@/program/decisions';
import type { Block, RirTarget } from '@/program/types';
import { daysBetween, parseDayKey } from './dates';

/**
 * Program week (1–52) advances on real elapsed time from the program start
 * date, independent of queue position. Week 1 is days 0–6.
 */
export function programWeek(startDayKey: string, now: Date): number {
  const days = daysBetween(parseDayKey(startDayKey), now);
  const week = Math.floor(Math.max(0, days) / 7) + 1;
  return CLAMP_WEEK_AT_52 ? Math.min(52, week) : week;
}

/** Elapsed days into the current program week (0–6). */
export function dayOfProgramWeek(startDayKey: string, now: Date): number {
  const days = daysBetween(parseDayKey(startDayKey), now);
  return ((Math.max(0, days) % 7) + 7) % 7;
}

export function isDeloadWeek(week: number): boolean {
  return DELOAD_WEEKS.includes(week);
}

/**
 * Part 1.3 — weeks 1–3 of Block 1 override every RIR target:
 * week 1 → 3–4, week 2 → 3, week 3 → 2–3. Null outside the on-ramp.
 */
export function onRampRir(week: number): RirTarget | null {
  if (week === 1) return { min: 3, max: 4 };
  if (week === 2) return { min: 3, max: 3 };
  if (week === 3) return { min: 2, max: 3 };
  return null;
}

/** Block 3/5: first week of a strength block runs main lifts at RIR 3. */
export function strengthEntryRir(block: Block, week: number): RirTarget | null {
  if (block.entryWeekMainRir && week === block.firstWeek) return block.entryWeekMainRir;
  return null;
}

export interface WeekInfo {
  week: number;
  block: Block;
  isDeload: boolean;
  label: string; // "Week 12 · Block 2 · Hypertrophy 2"
}

export function weekInfo(startDayKey: string, now: Date): WeekInfo {
  const week = programWeek(startDayKey, now);
  const block = blockForWeek(week);
  return {
    week,
    block,
    isDeload: isDeloadWeek(week),
    label: `Week ${week} · Block ${block.number} · ${block.name}`,
  };
}

/**
 * Part 5, "miss 4+ weeks": restart the current block from its week 1.
 * Returns the start-date day key that makes `now` fall in the block's first
 * week while keeping the same day-of-week alignment.
 */
export function startDateForBlockRestart(block: Block, now: Date): string {
  const daysIntoBlockFirstWeek = 0;
  const shift = (block.firstWeek - 1) * 7 + daysIntoBlockFirstWeek;
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - shift);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
