import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * Drizzle schema. The DDL in migrations.ts mirrors this file exactly; keep
 * them in step (there is a test that reads both).
 */

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  startedAt: text('started_at').notNull(),
  finishedAt: text('finished_at'),
  kind: text('kind').notNull(), // queue | minimum | deload | fullbody
  sessionType: text('session_type').notNull(), // PUSH | PULL | LEGS | FBA | FBB
  block: integer('block').notNull(),
  week: integer('week').notNull(),
  banner: text('banner'),
  programVersion: text('program_version').notNull(),
});

export const sets = sqliteTable('sets', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull(),
  exerciseId: text('exercise_id').notNull(),
  substitutedFrom: text('substituted_from'),
  cardIndex: integer('card_index').notNull(),
  slotIndex: integer('slot_index').notNull(),
  setIndex: integer('set_index').notNull(),
  load: real('load').notNull(),
  reps: integer('reps').notNull(),
  rir: integer('rir'),
  pain: integer('pain').notNull().default(0),
  toFailure: integer('to_failure').notNull().default(0),
  predictedRir: integer('predicted_rir'),
  repMin: integer('rep_min').notNull(),
  repMax: integer('rep_max').notNull(),
  rirMin: integer('rir_min'),
  rirMax: integer('rir_max'),
  countsForProgression: integer('counts_for_progression').notNull().default(1),
  loggedAt: text('logged_at').notNull(),
});

export const exerciseSettings = sqliteTable('exercise_settings', {
  exerciseId: text('exercise_id').primaryKey(),
  customIncrementLb: real('custom_increment_lb'),
  notes: text('notes'),
});

export const stalls = sqliteTable('stalls', {
  id: text('id').primaryKey(),
  exerciseId: text('exercise_id').notNull(),
  flaggedAt: text('flagged_at').notNull(),
  resolvedAt: text('resolved_at'),
  /** Step manually advanced/acknowledged by the user; null = computed from the flag date. */
  stepOverride: integer('step_override'),
});

export const calibrations = sqliteTable('calibrations', {
  id: text('id').primaryKey(),
  date: text('date').notNull(),
  exerciseId: text('exercise_id').notNull(),
  predictedRir: integer('predicted_rir').notNull(),
  repsAtPrediction: integer('reps_at_prediction').notNull(),
  actualReps: integer('actual_reps').notNull(),
  actualRir: integer('actual_rir').notNull(),
  delta: integer('delta').notNull(),
});

export const bodyweight = sqliteTable('bodyweight', {
  day: text('day').primaryKey(),
  lb: real('lb').notNull(),
});

export const waist = sqliteTable('waist', {
  day: text('day').primaryKey(),
  inches: real('inches').notNull(),
});

export const photos = sqliteTable('photos', {
  id: text('id').primaryKey(),
  day: text('day').notNull(),
  view: text('view').notNull(), // front | side | back
  uri: text('uri').notNull(),
});

export const dailyChecks = sqliteTable('daily_checks', {
  day: text('day').primaryKey(),
  creatine: integer('creatine').notNull().default(0),
  vitaminD: integer('vitamin_d').notNull().default(0),
  mobility: integer('mobility').notNull().default(0),
});

export const conditioning = sqliteTable('conditioning', {
  id: text('id').primaryKey(),
  day: text('day').notNull(),
  kind: text('kind').notNull(), // zone2 | interval
  minutes: integer('minutes').notNull(),
});

export const blockReviews = sqliteTable('block_reviews', {
  block: integer('block').primaryKey(),
  completedAt: text('completed_at').notNull(),
  answers: text('answers').notNull(), // JSON
});

export const kv = sqliteTable('kv', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export const schema = {
  sessions,
  sets,
  exerciseSettings,
  stalls,
  calibrations,
  bodyweight,
  waist,
  photos,
  dailyChecks,
  conditioning,
  blockReviews,
  kv,
};

export type SessionRow = typeof sessions.$inferSelect;
export type SetRow = typeof sets.$inferSelect;
export type StallRow = typeof stalls.$inferSelect;
export type CalibrationRow = typeof calibrations.$inferSelect;
export type PhotoRow = typeof photos.$inferSelect;
export type DailyCheckRow = typeof dailyChecks.$inferSelect;
export type ConditioningRow = typeof conditioning.$inferSelect;
export type BlockReviewRow = typeof blockReviews.$inferSelect;
