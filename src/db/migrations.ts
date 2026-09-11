/**
 * Hand-written, forward-only migrations. Applied at startup against
 * PRAGMA user_version so the app never depends on drizzle-kit output at
 * runtime. Add a new entry to migrate; never edit an applied one.
 */
export const MIGRATIONS: readonly string[][] = [
  // v1
  [
    `CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY NOT NULL,
      started_at TEXT NOT NULL,
      finished_at TEXT,
      kind TEXT NOT NULL,
      session_type TEXT NOT NULL,
      block INTEGER NOT NULL,
      week INTEGER NOT NULL,
      banner TEXT,
      program_version TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS sets (
      id TEXT PRIMARY KEY NOT NULL,
      session_id TEXT NOT NULL,
      exercise_id TEXT NOT NULL,
      substituted_from TEXT,
      card_index INTEGER NOT NULL,
      slot_index INTEGER NOT NULL,
      set_index INTEGER NOT NULL,
      load REAL NOT NULL,
      reps INTEGER NOT NULL,
      rir INTEGER,
      pain INTEGER NOT NULL DEFAULT 0,
      to_failure INTEGER NOT NULL DEFAULT 0,
      predicted_rir INTEGER,
      rep_min INTEGER NOT NULL,
      rep_max INTEGER NOT NULL,
      rir_min INTEGER,
      rir_max INTEGER,
      counts_for_progression INTEGER NOT NULL DEFAULT 1,
      logged_at TEXT NOT NULL
    );`,
    `CREATE INDEX IF NOT EXISTS idx_sets_exercise ON sets(exercise_id);`,
    `CREATE INDEX IF NOT EXISTS idx_sets_session ON sets(session_id);`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_sets_position ON sets(session_id, card_index, slot_index, set_index);`,
    `CREATE TABLE IF NOT EXISTS exercise_settings (
      exercise_id TEXT PRIMARY KEY NOT NULL,
      custom_increment_lb REAL,
      notes TEXT
    );`,
    `CREATE TABLE IF NOT EXISTS stalls (
      id TEXT PRIMARY KEY NOT NULL,
      exercise_id TEXT NOT NULL,
      flagged_at TEXT NOT NULL,
      resolved_at TEXT,
      step_override INTEGER
    );`,
    `CREATE TABLE IF NOT EXISTS calibrations (
      id TEXT PRIMARY KEY NOT NULL,
      date TEXT NOT NULL,
      exercise_id TEXT NOT NULL,
      predicted_rir INTEGER NOT NULL,
      reps_at_prediction INTEGER NOT NULL,
      actual_reps INTEGER NOT NULL,
      actual_rir INTEGER NOT NULL,
      delta INTEGER NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS bodyweight (day TEXT PRIMARY KEY NOT NULL, lb REAL NOT NULL);`,
    `CREATE TABLE IF NOT EXISTS waist (day TEXT PRIMARY KEY NOT NULL, inches REAL NOT NULL);`,
    `CREATE TABLE IF NOT EXISTS photos (
      id TEXT PRIMARY KEY NOT NULL,
      day TEXT NOT NULL,
      view TEXT NOT NULL,
      uri TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS daily_checks (
      day TEXT PRIMARY KEY NOT NULL,
      creatine INTEGER NOT NULL DEFAULT 0,
      vitamin_d INTEGER NOT NULL DEFAULT 0,
      mobility INTEGER NOT NULL DEFAULT 0
    );`,
    `CREATE TABLE IF NOT EXISTS conditioning (
      id TEXT PRIMARY KEY NOT NULL,
      day TEXT NOT NULL,
      kind TEXT NOT NULL,
      minutes INTEGER NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS block_reviews (
      block INTEGER PRIMARY KEY NOT NULL,
      completed_at TEXT NOT NULL,
      answers TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);`,
  ],
];

export const TABLE_NAMES = [
  'sessions',
  'sets',
  'exercise_settings',
  'stalls',
  'calibrations',
  'bodyweight',
  'waist',
  'photos',
  'daily_checks',
  'conditioning',
  'block_reviews',
  'kv',
] as const;
