import { ensureSchemaVersionTable, getSchemaVersion, setSchemaVersion } from './schemaVersion';
import type { SqliteDatabase } from './types';

interface SqliteMigration {
  version: number;
  statements: readonly string[];
}

const MIGRATIONS: readonly SqliteMigration[] = [
  {
    version: 1,
    statements: [
      `
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER
);
`,
      `
CREATE TABLE IF NOT EXISTS license (
  license_type TEXT NOT NULL
);
`,
      `
CREATE TABLE IF NOT EXISTS usage_logs (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
`,
    ],
  },
];

export const LATEST_SCHEMA_VERSION = MIGRATIONS.at(-1)?.version ?? 0;

async function runMigration(database: SqliteDatabase, migration: SqliteMigration): Promise<void> {
  await database.execAsync('BEGIN IMMEDIATE TRANSACTION;');

  try {
    await database.execAsync(migration.statements.join('\n'));
    await setSchemaVersion(database, migration.version);
    await database.execAsync('COMMIT;');
  } catch (error) {
    await database.execAsync('ROLLBACK;');
    throw error;
  }
}

export async function runMigrations(database: SqliteDatabase): Promise<number> {
  await ensureSchemaVersionTable(database);

  const currentVersion = await getSchemaVersion(database);

  if (currentVersion > LATEST_SCHEMA_VERSION) {
    const message = [
      `Database schema version ${currentVersion} is newer than supported version`,
      `${LATEST_SCHEMA_VERSION}.`,
    ].join(' ');
    throw new Error(message);
  }

  const pendingMigrations = MIGRATIONS.filter(({ version }) => version > currentVersion);

  await pendingMigrations.reduce<Promise<void>>(
    (chain, migration) => chain.then(() => runMigration(database, migration)),
    Promise.resolve(),
  );

  return pendingMigrations.at(-1)?.version ?? currentVersion;
}
