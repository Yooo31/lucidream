import * as SQLite from 'expo-sqlite';

import { runMigrations } from './migrations';
import type { SqliteDatabase, SqliteModule } from './types';

const DEFAULT_DATABASE_NAME = 'lucidream.db';

const defaultSqliteModule: SqliteModule = {
  openDatabaseAsync: SQLite.openDatabaseAsync,
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
