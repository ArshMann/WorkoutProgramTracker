import { dayKey, daysBetween } from '@/engine/dates';
import { classifyLayoff, layoffEffect, type LayoffEffect } from '@/engine/layoff';
import type { BuildContext } from '@/engine/session-builder';
import * as repo from '@/db/repo';
import { getHistoryByExercise, getIncrements, getLastFinishedSession } from '@/db/repo';
import { deriveQueueIndex, replayLayoff } from '@/engine/derive';
import { detectStall } from '@/engine/stall';
import { toIso } from '@/engine/dates';
import { useAppStore } from './app';

/** Days since the last finished session, or null if there has never been one. */
export function daysSinceLastSession(now: Date): number | null {
  const last = getLastFinishedSession();
  if (!last) return null;
  return daysBetween(new Date(last.finishedAt ?? last.startedAt), now);
}

export function currentLayoff(now: Date): LayoffEffect {
  const days = daysSinceLastSession(now);
  return layoffEffect(classifyLayoff(days), days);
}

export function manualDeloadActive(now: Date): boolean {
  const until = useAppStore.getState().manualDeloadUntilDay;
  return !!until && dayKey(now) <= until;
}

/** Everything the pure session builder needs, read from the DB and app state. */
export function buildContext(now: Date, opts: { layoff?: LayoffEffect } = {}): BuildContext {
  const app = useAppStore.getState();
  return {
    now,
    startDayKey: app.programStartDay ?? dayKey(now),
    historyByExercise: getHistoryByExercise(),
    customIncrements: getIncrements(),
    restSettings: app.restSettings,
    layoff: opts.layoff ?? layoffEffect('none', null),
    activeLayoff: app.activeLayoff,
    manualDeload: manualDeloadActive(now),
    slotOverrides: app.slotOverrides,
  };
}

/**
 * After a past session is edited, deleted, or logged after the fact, the
 * state that depends on history is re-derived from it: the queue position,
 * the return-loop layoff effect, and the stall flags. Prefill already reads
 * history live, so it needs nothing.
 */
export function recomputeDerivedState(now: Date = new Date()): void {
  const app = useAppStore.getState();
  const sessions = repo.getFinishedSessions().map((s) => ({ startedAt: s.startedAt, finishedAt: s.finishedAt, kind: s.kind as 'queue' | 'minimum' | 'deload' | 'fullbody' }));
  app.setQueueIndex(deriveQueueIndex(sessions));
  app.setActiveLayoff(replayLayoff(sessions));

  const history = getHistoryByExercise();
  const active = repo.getActiveStalls();
  const seen = new Set<string>();
  for (const [exerciseId, apps] of Object.entries(history)) {
    seen.add(exerciseId);
    const det = detectStall(apps);
    const existing = active.find((st) => st.exerciseId === exerciseId);
    if (det.stalled && !existing) repo.flagStall(exerciseId, det.since ?? toIso(now));
    else if (!det.stalled && existing) repo.resolveStall(existing.id, toIso(now));
  }
  for (const st of active) if (!seen.has(st.exerciseId)) repo.resolveStall(st.id, toIso(now));
}
