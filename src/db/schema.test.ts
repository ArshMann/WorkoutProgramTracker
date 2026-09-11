import { getTableColumns, getTableName } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { MIGRATIONS, TABLE_NAMES } from './migrations';
import { schema } from './schema';

/** The hand-written DDL and the Drizzle schema must describe the same tables and columns. */
describe('schema ↔ migrations parity', () => {
  const ddl = MIGRATIONS.flat().join('\n');

  it('every Drizzle table exists in the DDL with the same columns', () => {
    for (const table of Object.values(schema)) {
      const name = getTableName(table);
      const m = new RegExp(`CREATE TABLE IF NOT EXISTS ${name} \\(([^;]*)\\);`, 's').exec(ddl);
      expect(m, name).not.toBeNull();
      const ddlCols = m![1]
        .split(/,\s*\n?/)
        .map((l) => l.trim().split(/\s+/)[0])
        .filter(Boolean);
      const drizzleCols = Object.values(getTableColumns(table)).map((c) => c.name);
      expect(ddlCols.sort(), name).toEqual(drizzleCols.sort());
      expect(TABLE_NAMES).toContain(name);
    }
  });

  it('TABLE_NAMES (used by export/import) covers every table', () => {
    expect(TABLE_NAMES.length).toBe(Object.keys(schema).length);
  });
});
