export type SqliteRow = Record<string, unknown>;

export interface SqliteDatabase {
  execAsync(source: string): Promise<unknown>;
  getFirstAsync<T extends SqliteRow>(source: string): Promise<T | null>;
}

export interface SqliteModule {
  openDatabaseAsync(name: string): Promise<SqliteDatabase>;
}
