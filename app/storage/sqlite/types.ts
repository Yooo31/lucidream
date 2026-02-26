export type SqliteRow = Record<string, unknown>;
export type SqliteBindValue = string | number | null | boolean | Uint8Array;
export type SqliteBindParams = SqliteBindValue[];

export interface SqliteDatabase {
  execAsync(source: string): Promise<unknown>;
  runAsync(source: string, params?: SqliteBindParams): Promise<unknown>;
  getFirstAsync<T extends SqliteRow>(source: string, params?: SqliteBindParams): Promise<T | null>;
  getAllAsync<T extends SqliteRow>(source: string, params?: SqliteBindParams): Promise<T[]>;
}

export interface SqliteModule {
  openDatabaseAsync(name: string): Promise<SqliteDatabase>;
}
