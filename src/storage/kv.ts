import type { StateStorage } from 'zustand/middleware';

/**
 * Lightweight key-value store for app state. MMKV when the native module is
 * present (development / EAS builds); otherwise the SQLite `kv` table, so the
 * app also runs in Expo Go. Both are synchronous.
 */

interface KV {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
  backend: 'mmkv' | 'sqlite';
}

function tryMmkv(): KV | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-mmkv') as { MMKV?: new (cfg?: { id: string }) => { getString(k: string): string | undefined; set(k: string, v: string): void; delete(k: string): void } };
    if (!mod?.MMKV) return null;
    const store = new mod.MMKV({ id: 'ppl-logger' });
    return {
      backend: 'mmkv',
      get: (k) => store.getString(k) ?? null,
      set: (k, v) => store.set(k, v),
      remove: (k) => store.delete(k),
    };
  } catch {
    return null;
  }
}

function sqliteKv(): KV {
  // Lazy import keeps the DB module out of the pure engine's dependency graph.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getSqlite, runMigrations } = require('@/db/client') as typeof import('@/db/client');
  runMigrations();
  const s = getSqlite();
  return {
    backend: 'sqlite',
    get: (k) => s.getFirstSync<{ value: string }>('SELECT value FROM kv WHERE key = ?', [k])?.value ?? null,
    set: (k, v) => s.runSync('INSERT INTO kv(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [k, v]),
    remove: (k) => s.runSync('DELETE FROM kv WHERE key = ?', [k]),
  };
}

let instance: KV | null = null;

export function kv(): KV {
  if (!instance) instance = tryMmkv() ?? sqliteKv();
  return instance;
}

export const zustandStorage: StateStorage = {
  getItem: (name) => kv().get(name),
  setItem: (name, value) => kv().set(name, value),
  removeItem: (name) => kv().remove(name),
};
