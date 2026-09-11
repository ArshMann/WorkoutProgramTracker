import { STALL_CONSECUTIVE_NO_GAIN, STALL_MULTI_THRESHOLD, STALL_STEP_DAYS } from '@/program/decisions';
import { STALL_PROTOCOL_STEPS } from '@/program/reference';
import { daysBetween } from './dates';
import type { Appearance, LoggedSet } from './types';

/**
 * Part 11 trigger: zero total reps added across 3 consecutive appearances.
 *
 * Only queue sessions are compared (minimum, deload and full-body sessions
 * are not progression attempts at the prescribed sets). A load change in
 * either direction starts a new baseline; at the same load, an appearance
 * that does not add total reps counts as a failed attempt.
 */

function totalReps(sets: readonly LoggedSet[]): number {
  return sets.reduce((n, s) => n + s.reps, 0);
}

function workingLoad(sets: readonly LoggedSet[]): number {
  return sets.reduce((m, s) => Math.max(m, s.load), Number.NEGATIVE_INFINITY);
}

export interface StallDetection {
  stalled: boolean;
  /** Consecutive appearances (at the same load) that added zero reps, ending at the latest. */
  noGainRun: number;
  /** Date of the first no-gain appearance in the run, or null. */
  since: string | null;
}

export function detectStall(history: readonly Appearance[]): StallDetection {
  const attempts = history.filter((a) => a.kind === 'queue' && a.sets.length > 0);
  let run = 0;
  let since: string | null = null;
  for (let i = 1; i < attempts.length; i++) {
    const prev = attempts[i - 1];
    const cur = attempts[i];
    const sameLoad = workingLoad(cur.sets) === workingLoad(prev.sets);
    const gained = sameLoad && totalReps(cur.sets) > totalReps(prev.sets);
    if (!sameLoad || gained) {
      run = 0;
      since = null;
    } else {
      run += 1;
      if (run === 1) since = cur.date;
    }
  }
  return { stalled: run >= STALL_CONSECUTIVE_NO_GAIN, noGainRun: run, since };
}

/** Which Part 11 step is current, one step per week from the flag date (1–6). */
export function stallStep(flaggedAt: Date, now: Date): number {
  const weeks = Math.floor(Math.max(0, daysBetween(flaggedAt, now)) / STALL_STEP_DAYS);
  return Math.min(STALL_PROTOCOL_STEPS.length, weeks + 1);
}

export function stallStepText(step: number): string {
  return STALL_PROTOCOL_STEPS[Math.min(STALL_PROTOCOL_STEPS.length, Math.max(1, step)) - 1];
}

/** Part 11 step 7: three or more exercises stalled at once is a fatigue problem. */
export function isMultiStall(activeStallCount: number): boolean {
  return activeStallCount >= STALL_MULTI_THRESHOLD;
}
