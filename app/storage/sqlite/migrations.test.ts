import { LATEST_SCHEMA_VERSION, runMigrations } from './migrations';
import type { SqliteBindParams, SqliteDatabase, SqliteRow } from './types';

interface MockSqliteDatabase extends SqliteDatabase {
  execAsyncMock: jest.Mock<Promise<unknown>, [string]>;
  runAsyncMock: jest.Mock<Promise<unknown>, [string, SqliteBindParams?]>;
  getFirstAsyncMock: jest.Mock<Promise<SqliteRow | null>, [string, SqliteBindParams?]>;
  getAllAsyncMock: jest.Mock<Promise<SqliteRow[]>, [string, SqliteBindParams?]>;
}

function createMockDatabase(currentVersion: number | null): MockSqliteDatabase {
  const execAsyncMock = jest.fn<Promise<unknown>, [string]>().mockResolvedValue(undefined);
  const runAsyncMock = jest
    .fn<Promise<unknown>, [string, SqliteBindParams?]>()
    .mockResolvedValue(undefined);
  const getFirstAsyncMock = jest
    .fn<Promise<SqliteRow | null>, [string, SqliteBindParams?]>()
    .mockResolvedValue(currentVersion === null ? null : { version: currentVersion });
  const getAllAsyncMock = jest
    .fn<Promise<SqliteRow[]>, [string, SqliteBindParams?]>()
    .mockResolvedValue([]);

  return {
    execAsync: (source: string) => execAsyncMock(source),
    runAsync: (source: string, params?: SqliteBindParams) => runAsyncMock(source, params),
    getFirstAsync: async <T extends SqliteRow>(source: string, params?: SqliteBindParams) => {
      const row = await getFirstAsyncMock(source, params);
      return row as T | null;
    },
    getAllAsync: async <T extends SqliteRow>(source: string, params?: SqliteBindParams) => {
      const rows = await getAllAsyncMock(source, params);
      return rows as T[];
    },
    execAsyncMock,
    runAsyncMock,
    getFirstAsyncMock,
    getAllAsyncMock,
  };
}

function getExecutedStatements(database: MockSqliteDatabase): string[] {
  return database.execAsyncMock.mock.calls.map(([source]) => source);
}

describe('runMigrations', () => {
  it('applies all migrations when schema_version is empty', async () => {
    const database = createMockDatabase(null);

    const appliedVersion = await runMigrations(database);
    const statements = getExecutedStatements(database);
    const beginCount = statements.filter(
      (statement) => statement === 'BEGIN IMMEDIATE TRANSACTION;',
    ).length;
    const commitCount = statements.filter((statement) => statement === 'COMMIT;').length;

    expect(appliedVersion).toBe(LATEST_SCHEMA_VERSION);
    expect(database.getFirstAsyncMock).toHaveBeenCalledWith(
      'SELECT version FROM schema_version ORDER BY version DESC LIMIT 1;',
      undefined,
    );
    expect(statements[0]).toContain('CREATE TABLE IF NOT EXISTS schema_version');
    expect(statements).toEqual(
      expect.arrayContaining([
        'BEGIN IMMEDIATE TRANSACTION;',
        'COMMIT;',
        expect.stringContaining('CREATE TABLE IF NOT EXISTS license'),
        expect.stringContaining('CREATE TABLE IF NOT EXISTS usage_logs'),
        expect.stringContaining('CREATE TABLE IF NOT EXISTS dreams'),
        expect.stringContaining('CREATE TABLE IF NOT EXISTS tags'),
        expect.stringContaining('CREATE TABLE IF NOT EXISTS dream_tags'),
        expect.stringContaining('CREATE TABLE IF NOT EXISTS dream_assets'),
        expect.stringContaining('CREATE TABLE IF NOT EXISTS theme_settings'),
        expect.stringContaining('CREATE INDEX IF NOT EXISTS idx_dreams_created_at'),
        expect.stringContaining('INSERT INTO schema_version (version) VALUES (1);'),
        expect.stringContaining('INSERT INTO schema_version (version) VALUES (2);'),
        expect.stringContaining('INSERT INTO schema_version (version) VALUES (3);'),
      ]),
    );
    expect(beginCount).toBe(3);
    expect(commitCount).toBe(3);
  });

  it('upgrades schema from v1 to latest', async () => {
    const database = createMockDatabase(1);

    const appliedVersion = await runMigrations(database);
    const statementsList = getExecutedStatements(database);
    const statements = statementsList.join('\n');
    const beginCount = statementsList.filter(
      (statement) => statement === 'BEGIN IMMEDIATE TRANSACTION;',
    ).length;
    const commitCount = statementsList.filter((statement) => statement === 'COMMIT;').length;

    expect(appliedVersion).toBe(3);
    expect(statements).toContain('CREATE TABLE IF NOT EXISTS dreams');
    expect(statements).toContain('CREATE TABLE IF NOT EXISTS tags');
    expect(statements).toContain('CREATE TABLE IF NOT EXISTS dream_tags');
    expect(statements).toContain('CREATE TABLE IF NOT EXISTS dream_assets');
    expect(statements).toContain('CREATE TABLE IF NOT EXISTS theme_settings');
    expect(statements).toContain('CREATE INDEX IF NOT EXISTS idx_dreams_created_at');
    expect(statements).toContain('CREATE INDEX IF NOT EXISTS idx_dream_tags_tag_id');
    expect(statements).toContain('CREATE INDEX IF NOT EXISTS idx_tags_type_name');
    expect(statements).toContain('INSERT INTO schema_version (version) VALUES (2);');
    expect(statements).toContain('INSERT INTO schema_version (version) VALUES (3);');
    expect(statements).not.toContain('CREATE TABLE IF NOT EXISTS license');
    expect(statements).not.toContain('CREATE TABLE IF NOT EXISTS usage_logs');
    expect(beginCount).toBe(2);
    expect(commitCount).toBe(2);
  });

  it('skips migrations when schema is already at latest version', async () => {
    const database = createMockDatabase(LATEST_SCHEMA_VERSION);

    const appliedVersion = await runMigrations(database);

    expect(appliedVersion).toBe(LATEST_SCHEMA_VERSION);
    expect(database.execAsyncMock).toHaveBeenCalledTimes(1);
    expect(database.execAsyncMock).toHaveBeenCalledWith(
      expect.stringContaining('CREATE TABLE IF NOT EXISTS schema_version'),
    );
  });

  it('throws when database version is newer than supported version', async () => {
    const database = createMockDatabase(LATEST_SCHEMA_VERSION + 1);
    const expectedMessage = `Database schema version ${
      LATEST_SCHEMA_VERSION + 1
    } is newer than supported version ${LATEST_SCHEMA_VERSION}.`;

    await expect(runMigrations(database)).rejects.toThrow(expectedMessage);
    expect(database.execAsyncMock).toHaveBeenCalledTimes(1);
  });

  it('rolls back migration transaction when a migration fails', async () => {
    const database = createMockDatabase(1);
    database.execAsyncMock.mockImplementation(async (source: string) => {
      if (source.includes('CREATE TABLE IF NOT EXISTS dreams')) {
        throw new Error('Migration failed');
      }

      return undefined;
    });

    await expect(runMigrations(database)).rejects.toThrow('Migration failed');
    expect(database.execAsyncMock).toHaveBeenCalledWith('ROLLBACK;');
  });
});
