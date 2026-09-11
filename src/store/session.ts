import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { dayKey, toIso } from '@/engine/dates';
import { calibrationDelta } from '@/engine/calibration';
import { detectStall } from '@/engine/stall';
import { buildSession, replaceExercise, slotOverrideKey, type Variant } from '@/engine/session-builder';
import type { PlannedSession, PlannedSetRow } from '@/engine/types';
import { startDateForBlockRestart, weekInfo } from '@/engine/week';
import * as repo from '@/db/repo';
import { doneHaptic, tapHaptic } from '@/services/haptics';
import { cancelRestDone, scheduleRestDone } from '@/services/notifications';
import { zustandStorage } from '@/storage/kv';
import { getExercise } from '@/program/exercises';
import { useAppStore } from './app';
import { buildContext, currentLayoff } from './context';

export interface RowEdit {
  load?: number;
  reps?: number;
  rir?: number | null;
  pain?: boolean;
}

export interface LoggedRow {
  load: number;
  reps: number;
  rir: number | null;
  pain: boolean;
  toFailure: boolean;
  predictedRir: number | null;
  loggedAt: string;
}

export interface ActiveSession {
  sessionId: string;
  startedAt: string;
  variant: Variant;
  session: PlannedSession;
  edits: Record<string, RowEdit>;
  logged: Record<string, LoggedRow>;
  /** A calibration set in progress: prediction made, waiting for the failure rep count. */
  calibration: { rowKey: string; predictedRir: number } | null;
  calibrationOffered: boolean;
  /**
   * Card indexes in the order you walk through them today. Purely a display
   * order: row keys, stored sets, prefill and history are untouched by it.
   */
  cardOrder?: number[];
}

export interface TimerState {
  endsAt: number | null;
  totalSeconds: number;
  label: string;
}

interface SessionState {
  active: ActiveSession | null;
  timer: TimerState;
  start(variant: Variant, now?: Date): void;
  rowValue(row: PlannedSetRow): { load: number; reps: number; rir: number | null; pain: boolean };
  setEdit(key: string, patch: RowEdit): void;
  logRow(row: PlannedSetRow, now?: Date): void;
  unlogRow(row: PlannedSetRow): void;
  togglePain(row: PlannedSetRow): void;
  substitute(cardIndex: number, slotIndex: number, newExerciseId: string, joint: boolean, persistForBlock: boolean): void;
  /** "Do this later": moves the card to the end of today's walk order. */
  moveCardToEnd(cardIndex: number): void;
  beginCalibration(rowKey: string, predictedRir: number): void;
  cancelCalibration(): void;
  markCalibrationOffered(): void;
  finish(now?: Date): { stalledNow: string[] };
  discard(): void;
  startTimer(seconds: number, label: string): void;
  stopTimer(): void;
  extendTimer(seconds: number): void;
  nextRowKey(): string | null;
}

export function orderedCards(active: ActiveSession) {
  const order = active.cardOrder ?? active.session.cards.map((c) => c.index);
  const known = new Set(order);
  const missing = active.session.cards.map((c) => c.index).filter((i) => !known.has(i));
  return [...order, ...missing].map((i) => active.session.cards[i]).filter(Boolean);
}

function nextUnlogged(active: ActiveSession): PlannedSetRow | null {
  for (const card of orderedCards(active)) {
    for (const row of card.rows) if (!active.logged[row.key]) return row;
  }
  return null;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      active: null,
      timer: { endsAt: null, totalSeconds: 0, label: '' },

      start: (variant, now = new Date()) => {
        const app = useAppStore.getState();
        const layoff = currentLayoff(now);
        if (layoff.restartBlock && app.programStartDay) {
          // Part 5, 4+ weeks: restart the current block at its week 1.
          const block = weekInfo(app.programStartDay, now).block;
          app.setStartDay(startDateForBlockRestart(block, now));
        }
        const ctx = buildContext(now, { layoff });
        const session = buildSession(ctx, app.queueIndex, variant);
        const sessionId = repo.newId();
        repo.createSession({
          id: sessionId,
          startedAt: toIso(now),
          kind: session.kind,
          sessionType: session.sessionType,
          block: session.block,
          week: session.week,
          banner: session.banner,
        });
        if (layoff.kind !== 'none' && layoff.sessionsRemaining > 0) {
          app.setActiveLayoff({
            resumedAt: toIso(now),
            loadFactor: layoff.loadFactor,
            rirOverride: layoff.rirOverride,
            sessionsRemaining: layoff.sessionsRemaining,
            copy: layoff.copy,
          });
        }
        set({
          active: { sessionId, startedAt: toIso(now), variant, session, edits: {}, logged: {}, calibration: null, calibrationOffered: false },
          timer: { endsAt: null, totalSeconds: 0, label: '' },
        });
      },

      rowValue: (row) => {
        const a = get().active;
        const e = a?.edits[row.key] ?? {};
        const l = a?.logged[row.key];
        if (l) return { load: l.load, reps: l.reps, rir: l.rir, pain: l.pain };
        return { load: e.load ?? row.load, reps: e.reps ?? row.reps, rir: e.rir === undefined ? row.rir : e.rir, pain: e.pain ?? false };
      },

      setEdit: (key, patch) =>
        set((s) => (s.active ? { active: { ...s.active, edits: { ...s.active.edits, [key]: { ...s.active.edits[key], ...patch } } } } : s)),

      logRow: (row, now = new Date()) => {
        const s = get();
        const a = s.active;
        if (!a) return;
        const v = s.rowValue(row);
        const cal = a.calibration?.rowKey === row.key ? a.calibration : null;
        const exercise = a.session.cards[row.cardIndex]?.exercises.find((e) => e.slotIndex === row.slotIndex);
        const logged: LoggedRow = {
          load: v.load,
          reps: v.reps,
          rir: cal ? 0 : v.rir,
          pain: v.pain,
          toFailure: !!cal,
          predictedRir: cal?.predictedRir ?? null,
          loggedAt: toIso(now),
        };
        repo.upsertSet({
          sessionId: a.sessionId,
          exerciseId: row.exerciseId,
          substitutedFrom: exercise?.substitutedFrom ?? null,
          cardIndex: row.cardIndex,
          slotIndex: row.slotIndex,
          setIndex: row.setIndex,
          load: logged.load,
          reps: logged.reps,
          rir: logged.rir,
          pain: logged.pain,
          toFailure: logged.toFailure,
          predictedRir: logged.predictedRir,
          repMin: row.repRange.min,
          repMax: row.repRange.max,
          rirMin: row.rirTarget?.min ?? null,
          rirMax: row.rirTarget?.max ?? null,
          countsForProgression: row.countsForProgression,
          loggedAt: logged.loggedAt,
          prescribedSets: exercise?.prescription.sets ?? null,
        });
        if (cal) {
          const { actualRir, delta } = calibrationDelta(cal.predictedRir, row.reps, v.reps);
          repo.addCalibration({
            date: toIso(now),
            exerciseId: row.exerciseId,
            predictedRir: cal.predictedRir,
            repsAtPrediction: row.reps,
            actualReps: v.reps,
            actualRir,
            delta,
          });
          useAppStore.getState().setLastRirCalibrationAt(toIso(now));
        }
        tapHaptic();
        set({ active: { ...a, logged: { ...a.logged, [row.key]: logged }, calibration: cal ? null : a.calibration } });
        const remaining = nextUnlogged(get().active!);
        if (remaining) {
          const def = getExercise(remaining.exerciseId);
          get().startTimer(row.restSeconds, def.name);
        } else {
          get().stopTimer();
        }
      },

      unlogRow: (row) => {
        const a = get().active;
        if (!a || !a.logged[row.key]) return;
        repo.deleteSet(a.sessionId, row.cardIndex, row.slotIndex, row.setIndex);
        const logged = { ...a.logged };
        const prev = logged[row.key];
        delete logged[row.key];
        set({ active: { ...a, logged, edits: { ...a.edits, [row.key]: { load: prev.load, reps: prev.reps, rir: prev.rir, pain: prev.pain } } } });
      },

      togglePain: (row) => {
        const s = get();
        const a = s.active;
        if (!a) return;
        const cur = s.rowValue(row).pain;
        if (a.logged[row.key]) {
          const l = { ...a.logged[row.key], pain: !cur };
          const ex = a.session.cards[row.cardIndex]?.exercises.find((e) => e.slotIndex === row.slotIndex);
          repo.upsertSet({
            sessionId: a.sessionId,
            exerciseId: row.exerciseId,
            substitutedFrom: ex?.substitutedFrom ?? null,
            cardIndex: row.cardIndex,
            slotIndex: row.slotIndex,
            setIndex: row.setIndex,
            load: l.load,
            reps: l.reps,
            rir: l.rir,
            pain: l.pain,
            toFailure: l.toFailure,
            predictedRir: l.predictedRir,
            repMin: row.repRange.min,
            repMax: row.repRange.max,
            rirMin: row.rirTarget?.min ?? null,
            rirMax: row.rirTarget?.max ?? null,
            countsForProgression: row.countsForProgression,
            loggedAt: l.loggedAt,
            prescribedSets: ex?.prescription.sets ?? null,
          });
          set({ active: { ...a, logged: { ...a.logged, [row.key]: l } } });
        } else {
          s.setEdit(row.key, { pain: !cur });
        }
      },

      substitute: (cardIndex, slotIndex, newExerciseId, joint, persistForBlock) => {
        const a = get().active;
        if (!a) return;
        const ctx = buildContext(new Date());
        const session = replaceExercise(a.session, ctx, cardIndex, slotIndex, newExerciseId, joint);
        // Drop pending edits for the replaced slot; logged rows stay as logged.
        const edits = Object.fromEntries(Object.entries(a.edits).filter(([k]) => !k.startsWith(`${cardIndex}:${slotIndex}:`)));
        set({ active: { ...a, session, edits } });
        if (persistForBlock && !joint && session.kind !== 'fullbody') {
          useAppStore.getState().setSlotOverride(slotOverrideKey(session.block, session.sessionType, slotIndex), newExerciseId);
        }
      },

      moveCardToEnd: (cardIndex) =>
        set((s) => {
          if (!s.active) return s;
          const order = orderedCards(s.active).map((c) => c.index).filter((i) => i !== cardIndex);
          return { active: { ...s.active, cardOrder: [...order, cardIndex] } };
        }),

      beginCalibration: (rowKey, predictedRir) => set((s) => (s.active ? { active: { ...s.active, calibration: { rowKey, predictedRir }, calibrationOffered: true } } : s)),
      cancelCalibration: () => set((s) => (s.active ? { active: { ...s.active, calibration: null } } : s)),
      markCalibrationOffered: () => set((s) => (s.active ? { active: { ...s.active, calibrationOffered: true } } : s)),

      finish: (now = new Date()) => {
        const a = get().active;
        if (!a) return { stalledNow: [] };
        repo.finishSession(a.sessionId, toIso(now));
        const app = useAppStore.getState();
        if (a.session.advancesQueue) app.advanceQueue();
        if (app.activeLayoff && a.session.kind !== 'fullbody') app.consumeLayoffSession();

        // Part 11 — stall detection on every exercise attempted today.
        const stalledNow: string[] = [];
        if (a.session.kind === 'queue') {
          const history = repo.getHistoryByExercise();
          const active = repo.getActiveStalls();
          const touched = new Set(Object.keys(a.logged).map((k) => a.session.cards.flatMap((c) => c.rows).find((r) => r.key === k)?.exerciseId).filter(Boolean) as string[]);
          for (const exerciseId of touched) {
            const det = detectStall(history[exerciseId] ?? []);
            const existing = active.find((st) => st.exerciseId === exerciseId);
            if (det.stalled && !existing) {
              repo.flagStall(exerciseId, toIso(now));
              stalledNow.push(exerciseId);
            } else if (!det.stalled && existing && det.noGainRun === 0) {
              repo.resolveStall(existing.id, toIso(now));
            }
          }
        }
        get().stopTimer();
        set({ active: null });
        return { stalledNow };
      },

      discard: () => {
        const a = get().active;
        if (a) repo.deleteSession(a.sessionId);
        get().stopTimer();
        set({ active: null });
      },

      startTimer: (seconds, label) => {
        const endsAt = Date.now() + seconds * 1000;
        set({ timer: { endsAt, totalSeconds: seconds, label } });
        void scheduleRestDone(seconds, `Next: ${label}`);
      },
      stopTimer: () => {
        set({ timer: { endsAt: null, totalSeconds: 0, label: '' } });
        void cancelRestDone();
      },
      extendTimer: (seconds) => {
        const t = get().timer;
        if (!t.endsAt) return;
        const endsAt = Math.max(Date.now(), t.endsAt) + seconds * 1000;
        set({ timer: { ...t, endsAt, totalSeconds: t.totalSeconds + seconds } });
        void scheduleRestDone(Math.round((endsAt - Date.now()) / 1000), `Next: ${t.label}`);
      },
      nextRowKey: () => {
        const a = get().active;
        return a ? (nextUnlogged(a)?.key ?? null) : null;
      },
    }),
    {
      name: 'ppl-session',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (s) => ({ active: s.active, timer: s.timer }),
    },
  ),
);

/** Fires the in-app haptic once per timer when it reaches zero in the foreground. */
let firedFor: number | null = null;
export function tickTimer(): number | null {
  const t = useSessionStore.getState().timer;
  if (!t.endsAt) return null;
  const remaining = Math.max(0, Math.round((t.endsAt - Date.now()) / 1000));
  if (remaining === 0 && firedFor !== t.endsAt) {
    firedFor = t.endsAt;
    doneHaptic();
  }
  return remaining;
}

export function todayHasFinishedSession(now = new Date()): boolean {
  const last = repo.getLastFinishedSession();
  return !!last && dayKey(new Date(last.finishedAt ?? last.startedAt)) === dayKey(now);
}
