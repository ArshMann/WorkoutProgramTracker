import { asc, desc, eq, isNotNull } from 'drizzle-orm';
import { PROGRAM_VERSION } from '@/program';
import type { Appearance, LoggedSet, SessionKind } from '@/engine/types';
import { getDb, getSqlite } from './client';
import { TABLE_NAMES } from './migrations';
import {
  blockReviews,
  bodyweight,
  calibrations,
  conditioning,
  dailyChecks,
  exerciseSettings,
  kv,
  photos,
  sessions,
  sets,
  stalls,
  waist,
  type BlockReviewRow,
  type CalibrationRow,
  type ConditioningRow,
  type DailyCheckRow,
  type PhotoRow,
  type SessionRow,
  type SetRow,
  type StallRow,
} from './schema';

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// ───────────── sessions ─────────────

export interface NewSession {
  id: string;
  startedAt: string;
  kind: SessionKind;
  sessionType: string;
  block: number;
  week: number;
  banner: string | null;
}

export function createSession(s: NewSession): void {
  getDb().insert(sessions).values({ ...s, finishedAt: null, programVersion: PROGRAM_VERSION }).run();
}

export function finishSession(id: string, finishedAt: string): void {
  getDb().update(sessions).set({ finishedAt }).where(eq(sessions.id, id)).run();
}

export function deleteSession(id: string): void {
  const db = getDb();
  db.delete(sets).where(eq(sets.sessionId, id)).run();
  db.delete(sessions).where(eq(sessions.id, id)).run();
}

export function getSession(id: string): SessionRow | null {
  return getDb().select().from(sessions).where(eq(sessions.id, id)).get() ?? null;
}

export function getFinishedSessions(): SessionRow[] {
  return getDb().select().from(sessions).where(isNotNull(sessions.finishedAt)).orderBy(asc(sessions.startedAt)).all();
}

export function getLastFinishedSession(): SessionRow | null {
  return getDb().select().from(sessions).where(isNotNull(sessions.finishedAt)).orderBy(desc(sessions.finishedAt)).limit(1).get() ?? null;
}

export function getSessionDates(): Date[] {
  return getFinishedSessions().map((s) => new Date(s.startedAt));
}

// ───────────── sets ─────────────

export interface NewSet {
  sessionId: string;
  exerciseId: string;
  substitutedFrom: string | null;
  cardIndex: number;
  slotIndex: number;
  setIndex: number;
  load: number;
  reps: number;
  rir: number | null;
  pain: boolean;
  toFailure: boolean;
  predictedRir: number | null;
  repMin: number;
  repMax: number;
  rirMin: number | null;
  rirMax: number | null;
  countsForProgression: boolean;
  loggedAt: string;
}

export function upsertSet(s: NewSet): void {
  const db = getDb();
  const id = `${s.sessionId}:${s.cardIndex}:${s.slotIndex}:${s.setIndex}`;
  const values = {
    id,
    ...s,
    pain: s.pain ? 1 : 0,
    toFailure: s.toFailure ? 1 : 0,
    countsForProgression: s.countsForProgression ? 1 : 0,
  };
  db.insert(sets)
    .values(values)
    .onConflictDoUpdate({ target: sets.id, set: values })
    .run();
}

export function deleteSet(sessionId: string, cardIndex: number, slotIndex: number, setIndex: number): void {
  getDb().delete(sets).where(eq(sets.id, `${sessionId}:${cardIndex}:${slotIndex}:${setIndex}`)).run();
}

export function getSetsForSession(sessionId: string): SetRow[] {
  return getDb().select().from(sets).where(eq(sets.sessionId, sessionId)).orderBy(asc(sets.cardIndex), asc(sets.slotIndex), asc(sets.setIndex)).all();
}

function toLogged(r: SetRow): LoggedSet {
  return { load: r.load, reps: r.reps, rir: r.rir, pain: !!r.pain, toFailure: !!r.toFailure };
}

/**
 * Every finished session's sets, grouped into per-exercise appearances,
 * oldest first. A substituted exercise appears under its own id only.
 */
export function getHistoryByExercise(): Record<string, Appearance[]> {
  const db = getDb();
  const finished = getFinishedSessions();
  const byId = new Map(finished.map((s) => [s.id, s]));
  const allSets = db.select().from(sets).orderBy(asc(sets.cardIndex), asc(sets.slotIndex), asc(sets.setIndex)).all();
  const grouped = new Map<string, Map<string, SetRow[]>>(); // exerciseId → sessionId → rows
  for (const r of allSets) {
    if (!byId.has(r.sessionId)) continue;
    let bySession = grouped.get(r.exerciseId);
    if (!bySession) grouped.set(r.exerciseId, (bySession = new Map()));
    let rows = bySession.get(r.sessionId);
    if (!rows) bySession.set(r.sessionId, (rows = []));
    rows.push(r);
  }
  const out: Record<string, Appearance[]> = {};
  for (const [exerciseId, bySession] of grouped) {
    const apps: Appearance[] = [];
    for (const [sessionId, rows] of bySession) {
      const s = byId.get(sessionId)!;
      apps.push({
        sessionId,
        date: s.startedAt,
        kind: s.kind as SessionKind,
        repRanges: rows.map((r) => ({ min: r.repMin, max: r.repMax })),
        sets: rows.map(toLogged),
        modified: !!s.banner,
      });
    }
    apps.sort((a, b) => a.date.localeCompare(b.date));
    out[exerciseId] = apps;
  }
  return out;
}

export function getExerciseHistory(exerciseId: string): Appearance[] {
  return getHistoryByExercise()[exerciseId] ?? [];
}

/** Pain flags per exercise since a date (for the block review). */
export function getPainCounts(sinceIso: string): Record<string, number> {
  const rows = getSqlite().getAllSync<{ exercise_id: string; n: number }>(
    'SELECT exercise_id, COUNT(*) AS n FROM sets WHERE pain = 1 AND logged_at >= ? GROUP BY exercise_id',
    [sinceIso],
  );
  return Object.fromEntries(rows.map((r) => [r.exercise_id, r.n]));
}

// ───────────── exercise settings ─────────────

export function getIncrements(): Record<string, number> {
  const rows = getDb().select().from(exerciseSettings).all();
  const out: Record<string, number> = {};
  for (const r of rows) if (r.customIncrementLb && r.customIncrementLb > 0) out[r.exerciseId] = r.customIncrementLb;
  return out;
}

export function setIncrement(exerciseId: string, customIncrementLb: number | null): void {
  getDb()
    .insert(exerciseSettings)
    .values({ exerciseId, customIncrementLb })
    .onConflictDoUpdate({ target: exerciseSettings.exerciseId, set: { customIncrementLb } })
    .run();
}

// ───────────── stalls ─────────────

export function getActiveStalls(): StallRow[] {
  return getDb().select().from(stalls).orderBy(asc(stalls.flaggedAt)).all().filter((s) => !s.resolvedAt);
}

export function getAllStalls(): StallRow[] {
  return getDb().select().from(stalls).orderBy(asc(stalls.flaggedAt)).all();
}

export function flagStall(exerciseId: string, flaggedAt: string): void {
  getDb().insert(stalls).values({ id: newId(), exerciseId, flaggedAt, resolvedAt: null, stepOverride: null }).run();
}

export function resolveStall(id: string, resolvedAt: string): void {
  getDb().update(stalls).set({ resolvedAt }).where(eq(stalls.id, id)).run();
}

export function setStallStep(id: string, step: number | null): void {
  getDb().update(stalls).set({ stepOverride: step }).where(eq(stalls.id, id)).run();
}

// ───────────── calibrations ─────────────

export function addCalibration(c: Omit<CalibrationRow, 'id'>): void {
  getDb().insert(calibrations).values({ id: newId(), ...c }).run();
}

export function listCalibrations(): CalibrationRow[] {
  return getDb().select().from(calibrations).orderBy(asc(calibrations.date)).all();
}

// ───────────── body metrics ─────────────

export function upsertBodyweight(day: string, lb: number): void {
  getDb().insert(bodyweight).values({ day, lb }).onConflictDoUpdate({ target: bodyweight.day, set: { lb } }).run();
}
export function listBodyweight() {
  return getDb().select().from(bodyweight).orderBy(asc(bodyweight.day)).all();
}
export function deleteBodyweight(day: string): void {
  getDb().delete(bodyweight).where(eq(bodyweight.day, day)).run();
}

export function upsertWaist(day: string, inches: number): void {
  getDb().insert(waist).values({ day, inches }).onConflictDoUpdate({ target: waist.day, set: { inches } }).run();
}
export function listWaist() {
  return getDb().select().from(waist).orderBy(asc(waist.day)).all();
}

export function addPhoto(day: string, view: 'front' | 'side' | 'back', uri: string): void {
  getDb().insert(photos).values({ id: newId(), day, view, uri }).run();
}
export function listPhotos(): PhotoRow[] {
  return getDb().select().from(photos).orderBy(asc(photos.day)).all();
}
export function deletePhoto(id: string): void {
  getDb().delete(photos).where(eq(photos.id, id)).run();
}

export function getDailyCheck(day: string): DailyCheckRow {
  return getDb().select().from(dailyChecks).where(eq(dailyChecks.day, day)).get() ?? { day, creatine: 0, vitaminD: 0, mobility: 0 };
}
export function setDailyCheck(day: string, patch: Partial<Pick<DailyCheckRow, 'creatine' | 'vitaminD' | 'mobility'>>): void {
  const cur = getDailyCheck(day);
  const next = { ...cur, ...patch };
  getDb().insert(dailyChecks).values(next).onConflictDoUpdate({ target: dailyChecks.day, set: next }).run();
}
export function listDailyChecks(): DailyCheckRow[] {
  return getDb().select().from(dailyChecks).orderBy(asc(dailyChecks.day)).all();
}

export function addConditioning(day: string, kind: 'zone2' | 'interval', minutes: number): void {
  getDb().insert(conditioning).values({ id: newId(), day, kind, minutes }).run();
}
export function listConditioning(): ConditioningRow[] {
  return getDb().select().from(conditioning).orderBy(desc(conditioning.day)).all();
}
export function deleteConditioning(id: string): void {
  getDb().delete(conditioning).where(eq(conditioning.id, id)).run();
}

export function getBlockReview(block: number): BlockReviewRow | null {
  return getDb().select().from(blockReviews).where(eq(blockReviews.block, block)).get() ?? null;
}
export function saveBlockReview(block: number, answers: Record<string, unknown>, completedAt: string): void {
  const row = { block, completedAt, answers: JSON.stringify(answers) };
  getDb().insert(blockReviews).values(row).onConflictDoUpdate({ target: blockReviews.block, set: row }).run();
}

// ───────────── export / import ─────────────

export interface ExportPayload {
  app: 'ppl-logger';
  schemaVersion: number;
  programVersion: string;
  exportedAt: string;
  /** Persisted app state (start date, queue position, overrides). */
  appState?: string | null;
  tables: Record<string, Record<string, unknown>[]>;
}

export function exportAll(): ExportPayload {
  const s = getSqlite();
  const tables: Record<string, Record<string, unknown>[]> = {};
  for (const t of TABLE_NAMES) tables[t] = s.getAllSync<Record<string, unknown>>(`SELECT * FROM ${t}`);
  const version = s.getFirstSync<{ user_version: number }>('PRAGMA user_version;')?.user_version ?? 0;
  return { app: 'ppl-logger', schemaVersion: version, programVersion: PROGRAM_VERSION, exportedAt: new Date().toISOString(), tables };
}

/** Replaces every table with the payload's rows. Destructive; the caller confirms first. */
export function importAll(payload: ExportPayload): void {
  if (payload.app !== 'ppl-logger' || !payload.tables) throw new Error('Not a PPL Logger export.');
  const s = getSqlite();
  s.withTransactionSync(() => {
    for (const t of TABLE_NAMES) {
      s.runSync(`DELETE FROM ${t}`);
      const rows = payload.tables[t] ?? [];
      for (const row of rows) {
        const cols = Object.keys(row);
        if (cols.length === 0) continue;
        s.runSync(
          `INSERT INTO ${t} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
          cols.map((c) => row[c] as string | number | null),
        );
      }
    }
  });
}

export function kvGet(key: string): string | null {
  return getDb().select().from(kv).where(eq(kv.key, key)).get()?.value ?? null;
}
