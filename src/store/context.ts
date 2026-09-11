import { dayKey, daysBetween } from '@/engine/dates';
import { classifyLayoff, layoffEffect, type LayoffEffect } from '@/engine/layoff';
import type { BuildContext } from '@/engine/session-builder';
import { getHistoryByExercise, getIncrements, getLastFinishedSession } from '@/db/repo';
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
