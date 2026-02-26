import type { DreamQuality, LicenseType, TagType, UsageLogType } from '../../../domain';
import type { SqliteBindParams, SqliteDatabase, SqliteRow } from '../types';

type DreamAssetType = 'AUDIO' | 'DRAWING';

interface DreamRecord {
  id: string;
  created_at: number;
  quality: DreamQuality;
  title: string | null;
  content: string | null;
  rowid: number;
}

interface TagRecord {
  id: string;
  name: string;
  type: TagType;
  created_at: number;
  rowid: number;
}

interface DreamTagRecord {
  dream_id: string;
  tag_id: string;
  rowid: number;
}

interface DreamAssetRecord {
  id: string;
  dream_id: string;
  asset_type: DreamAssetType;
  file_path: string;
  created_at: number;
  rowid: number;
}

interface UsageLogRecord {
  id: string;
  type: UsageLogType;
  created_at: number;
  rowid: number;
}

interface LicenseRecord {
  license_type: LicenseType;
  rowid: number;
}

interface ThemeSettingsRecord {
  id: number;
  sleep_start_minutes: number;
  sleep_end_minutes: number;
  auto_infrared_enabled: number;
  rowid: number;
}

interface DatabaseState {
  dreams: Map<string, DreamRecord>;
  tags: Map<string, TagRecord>;
  dreamTags: DreamTagRecord[];
  dreamAssets: Map<string, DreamAssetRecord>;
  usageLogs: Map<string, UsageLogRecord>;
  licenses: LicenseRecord[];
  themeSettings: ThemeSettingsRecord | null;
  rowIdCounter: number;
}

function normalizeSql(source: string): string {
  return source.replace(/\s+/g, ' ').trim().replace(/;$/, '').toUpperCase();
}

function sortByCreatedAtDescIdDesc<T extends { created_at: number; id: string }>(rows: T[]): T[] {
  return rows.sort((left, right) => {
    if (left.created_at !== right.created_at) {
      return right.created_at - left.created_at;
    }

    if (left.id < right.id) {
      return 1;
    }

    if (left.id > right.id) {
      return -1;
    }

    return 0;
  });
}

function sortByCreatedAtDescIdAsc<T extends { created_at: number; id: string }>(rows: T[]): T[] {
  return rows.sort((left, right) => {
    if (left.created_at !== right.created_at) {
      return right.created_at - left.created_at;
    }

    if (left.id < right.id) {
      return -1;
    }

    if (left.id > right.id) {
      return 1;
    }

    return 0;
  });
}

function cloneState(state: DatabaseState): DatabaseState {
  return {
    dreams: new Map(
      Array.from(state.dreams.entries()).map(([id, row]) => [
        id,
        {
          ...row,
        },
      ]),
    ),
    tags: new Map(
      Array.from(state.tags.entries()).map(([id, row]) => [
        id,
        {
          ...row,
        },
      ]),
    ),
    dreamTags: state.dreamTags.map((row) => ({ ...row })),
    dreamAssets: new Map(
      Array.from(state.dreamAssets.entries()).map(([id, row]) => [
        id,
        {
          ...row,
        },
      ]),
    ),
    usageLogs: new Map(
      Array.from(state.usageLogs.entries()).map(([id, row]) => [
        id,
        {
          ...row,
        },
      ]),
    ),
    licenses: state.licenses.map((row) => ({ ...row })),
    themeSettings: state.themeSettings ? { ...state.themeSettings } : null,
    rowIdCounter: state.rowIdCounter,
  };
}

function createInitialState(): DatabaseState {
  return {
    dreams: new Map(),
    tags: new Map(),
    dreamTags: [],
    dreamAssets: new Map(),
    usageLogs: new Map(),
    licenses: [],
    themeSettings: null,
    rowIdCounter: 1,
  };
}

function castRow<T extends SqliteRow>(row: SqliteRow): T {
  return row as unknown as T;
}

function castRows<T extends SqliteRow>(rows: SqliteRow[]): T[] {
  return rows as unknown as T[];
}

export class InMemorySqliteTestDatabase implements SqliteDatabase {
  private state: DatabaseState = createInitialState();

  private transactionSnapshot: DatabaseState | null = null;

  async execAsync(source: string): Promise<unknown> {
    const sql = normalizeSql(source);

    if (sql === 'BEGIN IMMEDIATE TRANSACTION') {
      this.transactionSnapshot = cloneState(this.state);
    } else if (sql === 'COMMIT') {
      this.transactionSnapshot = null;
    } else if (sql === 'ROLLBACK' && this.transactionSnapshot !== null) {
      this.state = this.transactionSnapshot;
      this.transactionSnapshot = null;
    }

    return undefined;
  }

  async runAsync(source: string, params: SqliteBindParams = []): Promise<unknown> {
    const sql = normalizeSql(source);

    if (sql.startsWith('INSERT INTO DREAMS')) {
      const [id, createdAt, quality, title, content] = params as [
        string,
        number,
        DreamQuality,
        string | null,
        string | null,
      ];
      this.state.dreams.set(id, {
        id,
        created_at: createdAt,
        quality,
        title,
        content,
        rowid: this.nextRowId(),
      });
      return undefined;
    }

    if (sql.startsWith('UPDATE DREAMS SET')) {
      const [createdAt, quality, title, content, id] = params as [
        number,
        DreamQuality,
        string | null,
        string | null,
        string,
      ];
      const current = this.state.dreams.get(id);
      if (current) {
        this.state.dreams.set(id, {
          ...current,
          created_at: createdAt,
          quality,
          title,
          content,
        });
      }
      return undefined;
    }

    if (sql === 'DELETE FROM DREAMS WHERE ID = ?') {
      const [id] = params as [string];
      this.state.dreams.delete(id);
      this.state.dreamTags = this.state.dreamTags.filter((row) => row.dream_id !== id);
      this.state.dreamAssets = new Map(
        Array.from(this.state.dreamAssets.entries()).filter(([, row]) => row.dream_id !== id),
      );
      return undefined;
    }

    if (sql === 'INSERT INTO TAGS (ID, NAME, TYPE, CREATED_AT) VALUES (?, ?, ?, ?)') {
      const [id, name, type, createdAt] = params as [string, string, TagType, number];
      this.state.tags.set(id, {
        id,
        name,
        type,
        created_at: createdAt,
        rowid: this.nextRowId(),
      });
      return undefined;
    }

    if (sql.startsWith('UPDATE TAGS SET')) {
      const [name, type, createdAt, id] = params as [string, TagType, number, string];
      const current = this.state.tags.get(id);
      if (current) {
        this.state.tags.set(id, {
          ...current,
          name,
          type,
          created_at: createdAt,
        });
      }
      return undefined;
    }

    if (sql === 'DELETE FROM TAGS WHERE ID = ?') {
      const [id] = params as [string];
      this.state.tags.delete(id);
      this.state.dreamTags = this.state.dreamTags.filter((row) => row.tag_id !== id);
      return undefined;
    }

    if (sql === 'DELETE FROM DREAM_TAGS WHERE DREAM_ID = ?') {
      const [dreamId] = params as [string];
      this.state.dreamTags = this.state.dreamTags.filter((row) => row.dream_id !== dreamId);
      return undefined;
    }

    if (sql === 'INSERT INTO DREAM_TAGS (DREAM_ID, TAG_ID) VALUES (?, ?)') {
      const [dreamId, tagId] = params as [string, string];
      this.state.dreamTags.push({
        dream_id: dreamId,
        tag_id: tagId,
        rowid: this.nextRowId(),
      });
      return undefined;
    }

    if (sql === 'DELETE FROM DREAM_ASSETS WHERE DREAM_ID = ? AND ASSET_TYPE = ?') {
      const [dreamId, assetType] = params as [string, DreamAssetType];
      this.state.dreamAssets = new Map(
        Array.from(this.state.dreamAssets.entries()).filter(
          ([, row]) => !(row.dream_id === dreamId && row.asset_type === assetType),
        ),
      );
      return undefined;
    }

    if (sql === 'DELETE FROM DREAM_ASSETS WHERE DREAM_ID = ?') {
      const [dreamId] = params as [string];
      this.state.dreamAssets = new Map(
        Array.from(this.state.dreamAssets.entries()).filter(([, row]) => row.dream_id !== dreamId),
      );
      return undefined;
    }

    if (sql === 'DELETE FROM DREAM_ASSETS WHERE DREAM_ID = ? AND ID = ?') {
      const [dreamId, assetId] = params as [string, string];
      const asset = this.state.dreamAssets.get(assetId);

      if (asset && asset.dream_id === dreamId) {
        this.state.dreamAssets.delete(assetId);
      }

      return undefined;
    }

    if (sql.startsWith('INSERT INTO DREAM_ASSETS')) {
      const [id, dreamId, assetType, filePath, createdAt] = params as [
        string,
        string,
        DreamAssetType,
        string,
        number,
      ];
      this.state.dreamAssets.set(id, {
        id,
        dream_id: dreamId,
        asset_type: assetType,
        file_path: filePath,
        created_at: createdAt,
        rowid: this.nextRowId(),
      });
      return undefined;
    }

    if (sql === 'INSERT INTO USAGE_LOGS (ID, TYPE, CREATED_AT) VALUES (?, ?, ?)') {
      const [id, type, createdAt] = params as [string, UsageLogType, number];
      this.state.usageLogs.set(id, {
        id,
        type,
        created_at: createdAt,
        rowid: this.nextRowId(),
      });
      return undefined;
    }

    if (sql.startsWith('UPDATE USAGE_LOGS SET')) {
      const [type, createdAt, id] = params as [UsageLogType, number, string];
      const current = this.state.usageLogs.get(id);
      if (current) {
        this.state.usageLogs.set(id, {
          ...current,
          type,
          created_at: createdAt,
        });
      }
      return undefined;
    }

    if (sql === 'DELETE FROM USAGE_LOGS WHERE ID = ?') {
      const [id] = params as [string];
      this.state.usageLogs.delete(id);
      return undefined;
    }

    if (sql === 'INSERT INTO LICENSE (LICENSE_TYPE) VALUES (?)') {
      const [licenseType] = params as [LicenseType];
      this.state.licenses.push({
        license_type: licenseType,
        rowid: this.nextRowId(),
      });
      return undefined;
    }

    if (sql === 'DELETE FROM LICENSE') {
      this.state.licenses = [];
      return undefined;
    }

    if (sql === 'DELETE FROM THEME_SETTINGS') {
      this.state.themeSettings = null;
      return undefined;
    }

    if (
      sql ===
      'INSERT INTO THEME_SETTINGS (ID, SLEEP_START_MINUTES, SLEEP_END_MINUTES, AUTO_INFRARED_ENABLED) VALUES (1, ?, ?, ?)'
    ) {
      const [sleepStartMinutes, sleepEndMinutes, autoInfraredEnabled] = params as [
        number,
        number,
        number,
      ];
      this.state.themeSettings = {
        id: 1,
        sleep_start_minutes: sleepStartMinutes,
        sleep_end_minutes: sleepEndMinutes,
        auto_infrared_enabled: autoInfraredEnabled,
        rowid: this.nextRowId(),
      };
      return undefined;
    }

    throw new Error(`Unsupported runAsync query in test database: ${source}`);
  }

  async getFirstAsync<T extends SqliteRow>(
    source: string,
    params: SqliteBindParams = [],
  ): Promise<T | null> {
    const sql = normalizeSql(source);

    if (sql === 'SELECT ID, CREATED_AT, QUALITY, TITLE, CONTENT FROM DREAMS WHERE ID = ?') {
      const [id] = params as [string];
      const row = this.state.dreams.get(id);
      if (!row) {
        return null;
      }

      return castRow<T>({
        id: row.id,
        created_at: row.created_at,
        quality: row.quality,
        title: row.title,
        content: row.content,
      });
    }

    if (sql === 'SELECT COUNT(*) AS COUNT FROM DREAMS WHERE CREATED_AT >= ? AND CREATED_AT <= ?') {
      const [startCreatedAt, endCreatedAt] = params as [number, number];
      const count = Array.from(this.state.dreams.values()).filter(
        (row) => row.created_at >= startCreatedAt && row.created_at <= endCreatedAt,
      ).length;
      return castRow<T>({ count });
    }

    if (
      sql === 'SELECT COUNT(*) AS COUNT FROM DREAM_ASSETS WHERE DREAM_ID = ? AND ASSET_TYPE = ?'
    ) {
      const [dreamId, assetType] = params as [string, DreamAssetType];
      const count = Array.from(this.state.dreamAssets.values()).filter(
        (row) => row.dream_id === dreamId && row.asset_type === assetType,
      ).length;
      return castRow<T>({ count });
    }

    if (sql === 'SELECT ID, NAME, TYPE, CREATED_AT FROM TAGS WHERE ID = ?') {
      const [id] = params as [string];
      const row = this.state.tags.get(id);
      if (!row) {
        return null;
      }

      return castRow<T>({
        id: row.id,
        name: row.name,
        type: row.type,
        created_at: row.created_at,
      });
    }

    if (
      sql ===
      'SELECT ID, NAME, TYPE, CREATED_AT FROM TAGS WHERE TYPE = ? AND LOWER(TRIM(NAME)) = ? ORDER BY CREATED_AT DESC, ID ASC LIMIT 1'
    ) {
      const [type, normalizedName] = params as [TagType, string];
      const row = sortByCreatedAtDescIdAsc(
        Array.from(this.state.tags.values()).filter(
          (tag) => tag.type === type && tag.name.trim().toLowerCase() === normalizedName,
        ),
      )[0];

      if (!row) {
        return null;
      }

      return castRow<T>({
        id: row.id,
        name: row.name,
        type: row.type,
        created_at: row.created_at,
      });
    }

    if (sql === 'SELECT ID, TYPE, CREATED_AT FROM USAGE_LOGS WHERE ID = ?') {
      const [id] = params as [string];
      const row = this.state.usageLogs.get(id);
      if (!row) {
        return null;
      }

      return castRow<T>({
        id: row.id,
        type: row.type,
        created_at: row.created_at,
      });
    }

    if (
      sql ===
      'SELECT COUNT(*) AS COUNT FROM USAGE_LOGS WHERE TYPE = ? AND CREATED_AT >= ? AND CREATED_AT <= ?'
    ) {
      const [type, startCreatedAt, endCreatedAt] = params as [UsageLogType, number, number];
      const count = Array.from(this.state.usageLogs.values()).filter(
        (row) =>
          row.type === type && row.created_at >= startCreatedAt && row.created_at <= endCreatedAt,
      ).length;
      return castRow<T>({ count });
    }

    if (sql === 'SELECT LICENSE_TYPE FROM LICENSE ORDER BY ROWID DESC LIMIT 1') {
      const latest = this.state.licenses.slice().sort((left, right) => right.rowid - left.rowid)[0];
      if (!latest) {
        return null;
      }
      return castRow<T>({
        license_type: latest.license_type,
      });
    }

    if (
      sql ===
      'SELECT SLEEP_START_MINUTES, SLEEP_END_MINUTES, AUTO_INFRARED_ENABLED FROM THEME_SETTINGS WHERE ID = 1'
    ) {
      if (!this.state.themeSettings) {
        return null;
      }

      return castRow<T>({
        sleep_start_minutes: this.state.themeSettings.sleep_start_minutes,
        sleep_end_minutes: this.state.themeSettings.sleep_end_minutes,
        auto_infrared_enabled: this.state.themeSettings.auto_infrared_enabled,
      });
    }

    throw new Error(`Unsupported getFirstAsync query in test database: ${source}`);
  }

  async getAllAsync<T extends SqliteRow>(
    source: string,
    params: SqliteBindParams = [],
  ): Promise<T[]> {
    const sql = normalizeSql(source);

    if (
      sql.startsWith(
        'SELECT ID, CREATED_AT, QUALITY, TITLE, CONTENT FROM DREAMS WHERE CREATED_AT >= ? AND CREATED_AT <= ? ORDER BY CREATED_AT DESC, ID DESC',
      )
    ) {
      const [startCreatedAt, endCreatedAt, rawLimit, rawOffset] = params as [
        number,
        number,
        number | undefined,
        number | undefined,
      ];
      const rows = sortByCreatedAtDescIdDesc(
        Array.from(this.state.dreams.values()).filter(
          (row) => row.created_at >= startCreatedAt && row.created_at <= endCreatedAt,
        ),
      );
      let result = rows;

      if (sql.includes('LIMIT ?') && sql.includes('OFFSET ?')) {
        const offset = rawOffset ?? 0;
        const limit = rawLimit ?? 0;
        result = result.slice(offset, offset + limit);
      } else if (sql.includes('LIMIT ?')) {
        const limit = rawLimit ?? 0;
        result = result.slice(0, limit);
      } else if (sql.includes('OFFSET ?')) {
        const offset = rawLimit ?? 0;
        result = result.slice(offset);
      }

      return castRows<T>(
        result.map((row) => ({
          id: row.id,
          created_at: row.created_at,
          quality: row.quality,
          title: row.title,
          content: row.content,
        })),
      );
    }

    if (sql === 'SELECT TAG_ID FROM DREAM_TAGS WHERE DREAM_ID = ? ORDER BY ROWID ASC') {
      const [dreamId] = params as [string];
      return castRows<T>(
        this.state.dreamTags
          .slice()
          .filter((row) => row.dream_id === dreamId)
          .sort((left, right) => left.rowid - right.rowid)
          .map((row) => ({ tag_id: row.tag_id })),
      );
    }

    if (
      sql ===
      'SELECT ASSET_TYPE, FILE_PATH FROM DREAM_ASSETS WHERE DREAM_ID = ? ORDER BY CREATED_AT DESC, ID DESC'
    ) {
      const [dreamId] = params as [string];
      return castRows<T>(
        sortByCreatedAtDescIdDesc(
          Array.from(this.state.dreamAssets.values()).filter((row) => row.dream_id === dreamId),
        ).map((row) => ({
          asset_type: row.asset_type,
          file_path: row.file_path,
        })),
      );
    }

    if (
      sql ===
      'SELECT ID, DREAM_ID, ASSET_TYPE, FILE_PATH, CREATED_AT FROM DREAM_ASSETS WHERE DREAM_ID = ? ORDER BY CREATED_AT DESC, ID DESC'
    ) {
      const [dreamId] = params as [string];
      return castRows<T>(
        sortByCreatedAtDescIdDesc(
          Array.from(this.state.dreamAssets.values()).filter((row) => row.dream_id === dreamId),
        ).map((row) => ({
          id: row.id,
          dream_id: row.dream_id,
          asset_type: row.asset_type,
          file_path: row.file_path,
          created_at: row.created_at,
        })),
      );
    }

    if (sql === 'SELECT ID, NAME, TYPE, CREATED_AT FROM TAGS ORDER BY CREATED_AT DESC, ID ASC') {
      return castRows<T>(
        sortByCreatedAtDescIdAsc(Array.from(this.state.tags.values())).map((row) => ({
          id: row.id,
          name: row.name,
          type: row.type,
          created_at: row.created_at,
        })),
      );
    }

    if (
      sql === 'SELECT ID, NAME, TYPE, CREATED_AT FROM TAGS WHERE TYPE = ? ORDER BY NAME ASC, ID ASC'
    ) {
      const [type] = params as [TagType];
      return castRows<T>(
        Array.from(this.state.tags.values())
          .filter((row) => row.type === type)
          .sort((left, right) => {
            if (left.name < right.name) {
              return -1;
            }
            if (left.name > right.name) {
              return 1;
            }
            if (left.id < right.id) {
              return -1;
            }
            if (left.id > right.id) {
              return 1;
            }
            return 0;
          })
          .map((row) => ({
            id: row.id,
            name: row.name,
            type: row.type,
            created_at: row.created_at,
          })),
      );
    }

    if (
      sql ===
      'SELECT ID, NAME, TYPE, CREATED_AT FROM TAGS WHERE TYPE = ? AND LOWER(NAME) LIKE ? ORDER BY NAME ASC, ID ASC'
    ) {
      const [type, rawLike] = params as [TagType, string];
      const query = rawLike.replace(/%/g, '');

      return castRows<T>(
        Array.from(this.state.tags.values())
          .filter(
            (row) => row.type === type && row.name.toLowerCase().includes(query.toLowerCase()),
          )
          .sort((left, right) => {
            if (left.name < right.name) {
              return -1;
            }
            if (left.name > right.name) {
              return 1;
            }
            if (left.id < right.id) {
              return -1;
            }
            if (left.id > right.id) {
              return 1;
            }
            return 0;
          })
          .map((row) => ({
            id: row.id,
            name: row.name,
            type: row.type,
            created_at: row.created_at,
          })),
      );
    }

    if (
      sql ===
      'SELECT ID, NAME, TYPE, CREATED_AT FROM TAGS WHERE TYPE = ? AND LOWER(NAME) LIKE ? ORDER BY NAME ASC, ID ASC LIMIT ?'
    ) {
      const [type, rawLike, limit] = params as [TagType, string, number];
      const query = rawLike.replace(/%/g, '');

      return castRows<T>(
        Array.from(this.state.tags.values())
          .filter(
            (row) => row.type === type && row.name.toLowerCase().includes(query.toLowerCase()),
          )
          .sort((left, right) => {
            if (left.name < right.name) {
              return -1;
            }
            if (left.name > right.name) {
              return 1;
            }
            if (left.id < right.id) {
              return -1;
            }
            if (left.id > right.id) {
              return 1;
            }
            return 0;
          })
          .slice(0, limit)
          .map((row) => ({
            id: row.id,
            name: row.name,
            type: row.type,
            created_at: row.created_at,
          })),
      );
    }

    if (
      sql ===
      'SELECT T.ID, T.NAME, T.TYPE, T.CREATED_AT FROM TAGS T INNER JOIN DREAM_TAGS DT ON DT.TAG_ID = T.ID WHERE DT.DREAM_ID = ? ORDER BY T.CREATED_AT DESC, T.ID ASC'
    ) {
      const [dreamId] = params as [string];
      const tagIds = this.state.dreamTags
        .filter((row) => row.dream_id === dreamId)
        .map((row) => row.tag_id);
      return castRows<T>(
        sortByCreatedAtDescIdAsc(
          tagIds
            .map((tagId) => this.state.tags.get(tagId))
            .filter((tag): tag is TagRecord => tag !== undefined),
        ).map((row) => ({
          id: row.id,
          name: row.name,
          type: row.type,
          created_at: row.created_at,
        })),
      );
    }

    if (
      sql ===
      'SELECT ID, TYPE, CREATED_AT FROM USAGE_LOGS WHERE TYPE = ? AND CREATED_AT >= ? AND CREATED_AT <= ? ORDER BY CREATED_AT DESC, ID DESC'
    ) {
      const [type, startCreatedAt, endCreatedAt] = params as [UsageLogType, number, number];
      return castRows<T>(
        sortByCreatedAtDescIdDesc(
          Array.from(this.state.usageLogs.values()).filter(
            (row) =>
              row.type === type &&
              row.created_at >= startCreatedAt &&
              row.created_at <= endCreatedAt,
          ),
        ).map((row) => ({
          id: row.id,
          type: row.type,
          created_at: row.created_at,
        })),
      );
    }

    throw new Error(`Unsupported getAllAsync query in test database: ${source}`);
  }

  private nextRowId(): number {
    const value = this.state.rowIdCounter;
    this.state.rowIdCounter += 1;
    return value;
  }
}
