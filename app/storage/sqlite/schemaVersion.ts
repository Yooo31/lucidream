import type { SqliteDatabase, SqliteRow } from './types';

const CREATE_SCHEMA_VERSION_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER
);
`;

interface SchemaVersionRow extends SqliteRow {
  version: number;
}

export async function ensureSchemaVersionTable(database: SqliteDatabase): Promise<void> {
  await database.execAsync(CREATE_SCHEMA_VERSION_TABLE_SQL);
}

export async function getSchemaVersion(database: SqliteDatabase): Promise<number> {
  const row = await database.getFirstAsync<SchemaVersionRow>(
    'SELECT version FROM schema_version ORDER BY version DESC LIMIT 1;',
  );

  if (!row || typeof row.version !== 'number') {
    return 0;
  }

  return row.version;
}

export async function setSchemaVersion(database: SqliteDatabase, version: number): Promise<void> {
  await database.execAsync(`
DELETE FROM schema_version;
INSERT INTO schema_version (version) VALUES (${version});
`);
}
