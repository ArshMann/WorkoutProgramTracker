import { drizzle } from 'drizzle-orm/expo-sqlite';
import { deleteDatabaseSync, openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';
import { MIGRATIONS } from './migrations';
import { schema } from './schema';

export const DB_NAME = 'ppl-logger.db';

let sqlite: SQLiteDatabase | null = null;
let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getSqlite(): SQLiteDatabase {
  if (!sqlite) {
    sqlite = openDatabaseSync(DB_NAME);
    sqlite.execSync('PRAGMA journal_mode = WAL;');
    sqlite.execSync('PRAGMA foreign_keys = ON;');
  }
  return sqlite;
}

export function getDb() {
  if (!db) db = drizzle(getSqlite(), { schema });
  return db;
}

/** Forward-only migrations keyed on PRAGMA user_version. Safe to call every launch. */
export function runMigrations(): void {
  const s = getSqlite();
  const row = s.getFirstSync<{ user_version: number }>('PRAGMA user_version;');
  const current = row?.user_version ?? 0;
  for (let v = current; v < MIGRATIONS.length; v++) {
    s.withTransactionSync(() => {
      for (const stmt of MIGRATIONS[v]) s.execSync(stmt);
      s.execSync(`PRAGMA user_version = ${v + 1};`);
    });
  }
}

/** Erase everything: close, delete the database file, recreate it empty. */
export function resetDatabase(): void {
  try {
    sqlite?.closeSync();
  } catch {
    // already closed
  }
  sqlite = null;
  db = null;
  try {
    deleteDatabaseSync(DB_NAME);
  } catch {
    // no file yet
  }
  runMigrations();
}
