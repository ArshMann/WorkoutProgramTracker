import { LAYOFF_LOOP_SESSIONS } from '@/program/decisions';
import { daysBetween } from './dates';
import { classifyLayoff, layoffEffect } from './layoff';
import type { ActiveLayoff } from './session-builder';
import type { SessionKind } from './types';

/**
 * State the app used to carry forward is re-derived from the session
 * history whenever that history is edited (a past session corrected,
 * deleted, or logged after the fact). Nothing is patched in place.
 */

export interface HistoricSession {
  startedAt: string; // ISO
  finishedAt: string | null;
  kind: SessionKind;
}

/** The queue started at PUSH; every finished session except full-body advanced it by one. */
export function deriveQueueIndex(sessions: readonly HistoricSession[]): number {
  const n = sessions.filter((s) => s.finishedAt && s.kind !== 'fullbody').length;
  return n % 3;
}

/**
 * Replay the Part 5 matrix over the finished sessions in date order and
 * return the return-loop effect still in force after the last one, if any.
 * (A 4+ week gap's block restart moved the start date at the time; that is
 * not replayed here — only the load/RIR loop.)
 */
export function replayLayoff(sessions: readonly HistoricSession[]): ActiveLayoff | null {
  const finished = sessions
    .filter((s) => s.finishedAt)
    .slice()
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  let active: ActiveLayoff | null = null;
  for (let i = 0; i < finished.length; i++) {
    const cur = finished[i];
    const prev = finished[i - 1];
    const days = prev ? daysBetween(new Date(prev.finishedAt ?? prev.startedAt), new Date(cur.startedAt)) : null;
    const effect = layoffEffect(classifyLayoff(days), days);
    if (effect.kind !== 'none' && effect.sessionsRemaining > 0) {
      active = {
        resumedAt: cur.startedAt,
        loadFactor: effect.loadFactor,
        rirOverride: effect.rirOverride,
        sessionsRemaining: effect.sessionsRemaining,
        copy: effect.copy,
      };
    }
    if (active && cur.kind !== 'fullbody') {
      const remaining: number = active.sessionsRemaining - 1;
      const kept: ActiveLayoff = { ...active, sessionsRemaining: remaining };
      active = remaining > 0 ? kept : null;
    }
  }
  return active;
}

export const LAYOFF_LOOP = LAYOFF_LOOP_SESSIONS;
