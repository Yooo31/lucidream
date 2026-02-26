import * as SQLite from 'expo-sqlite';

import { runMigrations } from './migrations';
import type { SqliteDatabase, SqliteModule, SqliteRow } from './types';

const DEFAULT_DATABASE_NAME = 'lucidream.db';

function toSqliteDatabaseAdapter(database: SQLite.SQLiteDatabase): SqliteDatabase {
  return {
    execAsync: (source: string) => database.execAsync(source),
    runAsync: (source: string, params = []) => database.runAsync(source, params),
    getFirstAsync: async <T extends SqliteRow>(source: string, params = []) =>
      database.getFirstAsync<T>(source, params),
    getAllAsync: async <T extends SqliteRow>(source: string, params = []) =>
      database.getAllAsync<T>(source, params),
  };
}

const defaultSqliteModule: SqliteModule = {
  openDatabaseAsync: async (name: string) => {
    const database = await SQLite.openDatabaseAsync(name);
    return toSqliteDatabaseAdapter(database);
  },
};

interface InitializeDatabaseOptions {
  databaseName?: string;
  sqliteModule?: SqliteModule;
}

export async function initializeDatabase(
  options: InitializeDatabaseOptions = {},
): Promise<SqliteDatabase> {
  const { databaseName = DEFAULT_DATABASE_NAME, sqliteModule = defaultSqliteModule } = options;

  const database = await sqliteModule.openDatabaseAsync(databaseName);
  await runMigrations(database);

  return database;
}
