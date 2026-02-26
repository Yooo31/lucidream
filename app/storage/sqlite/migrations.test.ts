import { LATEST_SCHEMA_VERSION, runMigrations } from './migrations';
import type { SqliteDatabase, SqliteRow } from './types';

interface MockSqliteDatabase extends SqliteDatabase {
  execAsyncMock: jest.Mock<Promise<unknown>, [string]>;
  getFirstAsyncMock: jest.Mock<Promise<SqliteRow | null>, [string]>;
}

function createMockDatabase(currentVersion: number | null): MockSqliteDatabase {
  const execAsyncMock = jest.fn<Promise<unknown>, [string]>().mockResolvedValue(undefined);
  const getFirstAsyncMock = jest
    .fn<Promise<SqliteRow | null>, [string]>()
    .mockResolvedValue(currentVersion === null ? null : { version: currentVersion });

  return {
    execAsync: (source: string) => execAsyncMock(source),
    getFirstAsync: async <T extends SqliteRow>(source: string) => {
      const row = await getFirstAsyncMock(source);
      return row as T | null;
    },
    execAsyncMock,
    getFirstAsyncMock,
  };
}

describe('runMigrations', () => {
  it('applies v1 migration when schema_version is empty', async () => {
    const database = createMockDatabase(null);

    const appliedVersion = await runMigrations(database);

    expect(appliedVersion).toBe(1);
    expect(database.getFirstAsyncMock).toHaveBeenCalledWith(
      'SELECT version FROM schema_version ORDER BY version DESC LIMIT 1;',
    );
    expect(database.execAsyncMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('CREATE TABLE IF NOT EXISTS schema_version'),
    );
    expect(database.execAsyncMock).toHaveBeenNthCalledWith(2, 'BEGIN IMMEDIATE TRANSACTION;');
    expect(database.execAsyncMock).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('CREATE TABLE IF NOT EXISTS license'),
    );
    expect(database.execAsyncMock).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('CREATE TABLE IF NOT EXISTS usage_logs'),
    );
    expect(database.execAsyncMock).toHaveBeenNthCalledWith(
      4,
      expect.stringContaining('INSERT INTO schema_version (version) VALUES (1);'),
    );
    expect(database.execAsyncMock).toHaveBeenNthCalledWith(5, 'COMMIT;');
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
    const database = createMockDatabase(0);
    database.execAsyncMock.mockImplementation(async (source: string) => {
      if (source.includes('CREATE TABLE IF NOT EXISTS license')) {
        throw new Error('Migration failed');
      }

      return undefined;
    });

    await expect(runMigrations(database)).rejects.toThrow('Migration failed');
    expect(database.execAsyncMock).toHaveBeenCalledWith('ROLLBACK;');
  });
});
