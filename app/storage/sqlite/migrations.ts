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
  {
    version: 2,
    statements: [
      `
CREATE TABLE IF NOT EXISTS dreams (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  quality TEXT NOT NULL,
  title TEXT,
  content TEXT
);
`,
      `
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
`,
      `
CREATE TABLE IF NOT EXISTS dream_tags (
  dream_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  PRIMARY KEY (dream_id, tag_id),
  FOREIGN KEY (dream_id) REFERENCES dreams(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);
`,
      `
CREATE TABLE IF NOT EXISTS dream_assets (
  id TEXT PRIMARY KEY,
  dream_id TEXT NOT NULL,
  asset_type TEXT NOT NULL,
  file_path TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (dream_id) REFERENCES dreams(id) ON DELETE CASCADE
);
`,
      `
CREATE INDEX IF NOT EXISTS idx_dreams_created_at ON dreams(created_at);
`,
      `
CREATE INDEX IF NOT EXISTS idx_dream_tags_dream_id ON dream_tags(dream_id);
`,
      `
CREATE INDEX IF NOT EXISTS idx_dream_tags_tag_id ON dream_tags(tag_id);
`,
      `
CREATE INDEX IF NOT EXISTS idx_tags_type_name ON tags(type, name);
`,
      `
CREATE INDEX IF NOT EXISTS idx_dream_assets_dream_id_created_at
ON dream_assets(dream_id, created_at);
`,
    ],
  },
  {
    version: 3,
    statements: [
      `
CREATE TABLE IF NOT EXISTS theme_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  sleep_start_minutes INTEGER NOT NULL,
  sleep_end_minutes INTEGER NOT NULL
);
`,
    ],
  },
  {
    version: 4,
    statements: [
      `
ALTER TABLE theme_settings
ADD COLUMN auto_infrared_enabled INTEGER NOT NULL DEFAULT 1;
`,
    ],
  },
  {
    version: 5,
    statements: [
      `
CREATE TABLE IF NOT EXISTS reality_check_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  mode TEXT NOT NULL,
  interval_hours INTEGER,
  active_start_minutes INTEGER NOT NULL,
  active_end_minutes INTEGER NOT NULL,
  notification_text TEXT NOT NULL
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
