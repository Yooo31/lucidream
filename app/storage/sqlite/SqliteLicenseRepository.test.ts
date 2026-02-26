import type { LicenseType } from '../../domain';

import { SqliteLicenseRepository } from './SqliteLicenseRepository';
import type { SqliteBindParams, SqliteDatabase, SqliteRow } from './types';

interface MockSqliteDatabase extends SqliteDatabase {
  execAsyncMock: jest.Mock<Promise<unknown>, [string]>;
  runAsyncMock: jest.Mock<Promise<unknown>, [string, SqliteBindParams?]>;
  getFirstAsyncMock: jest.Mock<Promise<SqliteRow | null>, [string, SqliteBindParams?]>;
}

function createMockDatabase(row: { license_type: LicenseType } | null = null): MockSqliteDatabase {
  const execAsyncMock = jest.fn<Promise<unknown>, [string]>().mockResolvedValue(undefined);
  const runAsyncMock = jest
    .fn<Promise<unknown>, [string, SqliteBindParams?]>()
    .mockResolvedValue(undefined);
  const getFirstAsyncMock = jest
    .fn<Promise<SqliteRow | null>, [string, SqliteBindParams?]>()
    .mockResolvedValue(row);

  return {
    execAsync: (source: string) => execAsyncMock(source),
    runAsync: (source: string, params?: SqliteBindParams) => runAsyncMock(source, params),
    getFirstAsync: async <T extends SqliteRow>(source: string, params?: SqliteBindParams) => {
      const value = await getFirstAsyncMock(source, params);
      return value as T | null;
    },
    getAllAsync: async <T extends SqliteRow>() => [] as T[],
    execAsyncMock,
    runAsyncMock,
    getFirstAsyncMock,
  };
}

describe('SqliteLicenseRepository', () => {
  it('persists license type with create', async () => {
    const database = createMockDatabase();
    const repository = new SqliteLicenseRepository(database);

    await repository.create('PRO');

    expect(database.runAsyncMock).toHaveBeenCalledWith(
      'INSERT INTO license (license_type) VALUES (?);',
      ['PRO'],
    );
  });

  it('returns null when no persisted license exists', async () => {
    const database = createMockDatabase(null);
    const repository = new SqliteLicenseRepository(database);

    await expect(repository.getCurrent()).resolves.toBeNull();
  });

  it('returns the latest persisted license type', async () => {
    const database = createMockDatabase({ license_type: 'MEDIUM' });
    const repository = new SqliteLicenseRepository(database);

    await expect(repository.getCurrent()).resolves.toBe('MEDIUM');
    expect(database.getFirstAsyncMock).toHaveBeenCalledWith(
      expect.stringContaining('SELECT license_type'),
      undefined,
    );
  });

  it('replaces persisted license type atomically on update', async () => {
    const database = createMockDatabase();
    const repository = new SqliteLicenseRepository(database);

    await repository.update('FREE');

    expect(database.execAsyncMock).toHaveBeenNthCalledWith(1, 'BEGIN IMMEDIATE TRANSACTION;');
    expect(database.runAsyncMock).toHaveBeenNthCalledWith(1, 'DELETE FROM license;', undefined);
    expect(database.runAsyncMock).toHaveBeenNthCalledWith(
      2,
      'INSERT INTO license (license_type) VALUES (?);',
      ['FREE'],
    );
    expect(database.execAsyncMock).toHaveBeenNthCalledWith(2, 'COMMIT;');
  });

  it('rolls back update transaction when write fails', async () => {
    const database = createMockDatabase();
    database.runAsyncMock.mockImplementation(async (source: string) => {
      if (source.startsWith('INSERT INTO license')) {
        throw new Error('write failed');
      }

      return undefined;
    });
    const repository = new SqliteLicenseRepository(database);

    await expect(repository.update('MEDIUM')).rejects.toThrow('write failed');
    expect(database.execAsyncMock).toHaveBeenCalledWith('ROLLBACK;');
  });

  it('clears persisted license on delete', async () => {
    const database = createMockDatabase();
    const repository = new SqliteLicenseRepository(database);

    await repository.delete();

    expect(database.runAsyncMock).toHaveBeenCalledWith('DELETE FROM license;', undefined);
  });
});
