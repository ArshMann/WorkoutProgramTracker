import {
  LAYOFF_DAYS,
  LAYOFF_LOAD_FACTOR_2_3_WEEKS,
  LAYOFF_LOAD_FACTOR_4_PLUS_WEEKS,
  LAYOFF_LOOP_SESSIONS,
  LAYOFF_RIR_2_3_WEEKS,
  LAYOFF_RIR_4_PLUS_WEEKS,
} from '@/program/decisions';
import type { RirTarget } from '@/program/types';

export type LayoffKind = 'none' | 'week' | 'two-to-three-weeks' | 'four-plus-weeks';

/** Part 5 — classify the gap since the last logged session. Null last session → 'none' (first ever). */
export function classifyLayoff(daysSinceLastSession: number | null): LayoffKind {
  if (daysSinceLastSession === null) return 'none';
  if (daysSinceLastSession <= LAYOFF_DAYS.nothingUpTo) return 'none';
  if (daysSinceLastSession <= LAYOFF_DAYS.weekUpTo) return 'week';
  if (daysSinceLastSession <= LAYOFF_DAYS.twoToThreeWeeksUpTo) return 'two-to-three-weeks';
  return 'four-plus-weeks';
}

export interface LayoffEffect {
  kind: LayoffKind;
  /** Multiplier applied to loads whose last appearance predates the return. */
  loadFactor: number;
  /** RIR target override while the effect lasts. */
  rirOverride: RirTarget | null;
  /** No load increases while the effect lasts. */
  suppressProgression: boolean;
  /** Number of queue sessions the effect persists for (0 = this session only / none). */
  sessionsRemaining: number;
  /** Restart the current block at its week 1. */
  restartBlock: boolean;
  /** One line of copy. The app catching you, never scolding. */
  copy: string | null;
}

export function layoffEffect(kind: LayoffKind, days: number | null): LayoffEffect {
  switch (kind) {
    case 'none':
      return {
        kind,
        loadFactor: 1,
        rirOverride: null,
        suppressProgression: false,
        sessionsRemaining: 0,
        restartBlock: false,
        copy: null,
      };
    case 'week':
      return {
        kind,
        loadFactor: 1,
        rirOverride: null,
        suppressProgression: true,
        sessionsRemaining: 1,
        restartBlock: false,
        copy: `${days} days since the last session. Same loads as last time, no progression today.`,
      };
    case 'two-to-three-weeks':
      return {
        kind,
        loadFactor: LAYOFF_LOAD_FACTOR_2_3_WEEKS,
        rirOverride: LAYOFF_RIR_2_3_WEEKS,
        suppressProgression: true,
        sessionsRemaining: LAYOFF_LOOP_SESSIONS,
        restartBlock: false,
        copy: `${days} days since the last session. Loads set to −10 %, RIR 2–3 for one full loop, then normal rules.`,
      };
    case 'four-plus-weeks':
      return {
        kind,
        loadFactor: LAYOFF_LOAD_FACTOR_4_PLUS_WEEKS,
        rirOverride: LAYOFF_RIR_4_PLUS_WEEKS,
        suppressProgression: true,
        sessionsRemaining: LAYOFF_LOOP_SESSIONS,
        restartBlock: true,
        copy: `${days} days since the last session. Current block restarted at its week 1, loads set to −15 %, this week is an on-ramp at RIR 3–4.`,
      };
  }
}
