import type { Dream, DreamAsset, DreamAssetType, DreamQuality } from '../../domain';
import type { DreamHistoryQuery, DreamRepository } from '../../services';

import type { SqliteBindParams, SqliteDatabase, SqliteRow } from './types';

interface DreamRow extends SqliteRow {
  id: string;
  created_at: number;
  quality: DreamQuality;
  title: string | null;
  content: string | null;
}

interface DreamTagRow extends SqliteRow {
  tag_id: string;
}

interface DreamAssetRow extends SqliteRow {
  id: string;
  dream_id: string;
  asset_type: DreamAssetType;
  file_path: string;
  created_at: number;
}

interface CountRow extends SqliteRow {
  count: number | string;
}

interface DreamAssets {
  audioPath?: string;
  drawingPath?: string;
}

function normalizePositiveInteger(value: number | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.floor(value));
}

function normalizeText(value: string | undefined): string | null {
  return value ?? null;
}

function uniqueValues(values: readonly string[]): string[] {
  return Array.from(new Set(values));
}

function getCountValue(row: CountRow | null): number {
  if (!row) {
    return 0;
  }

  if (typeof row.count === 'number') {
    return row.count;
  }

  const parsed = Number.parseInt(row.count, 10);

  return Number.isNaN(parsed) ? 0 : parsed;
}

function mapDreamRow(row: DreamRow, tagIds: readonly string[], assets: DreamAssets): Dream {
  const dream: Dream = {
    id: row.id,
    createdAt: row.created_at,
    quality: row.quality,
    tagIds,
  };

  if (row.title !== null) {
    dream.title = row.title;
  }

  if (row.content !== null) {
    dream.content = row.content;
  }

  if (assets.audioPath !== undefined) {
    dream.audioPath = assets.audioPath;
  }

  if (assets.drawingPath !== undefined) {
    dream.drawingPath = assets.drawingPath;
  }

  return dream;
}

function mapDreamAssetRow(row: DreamAssetRow): DreamAsset {
  return {
    id: row.id,
    dreamId: row.dream_id,
    type: row.asset_type,
    filePath: row.file_path,
    createdAt: row.created_at,
  };
}

export class SqliteDreamRepository implements DreamRepository {
  constructor(private readonly database: SqliteDatabase) {}

  async create(dream: Dream): Promise<void> {
    await this.withTransaction(async () => {
      await this.database.runAsync(
        `
INSERT INTO dreams (id, created_at, quality, title, content)
VALUES (?, ?, ?, ?, ?);
`,
        [
          dream.id,
          dream.createdAt,
          dream.quality,
          normalizeText(dream.title),
          normalizeText(dream.content),
        ],
      );

      await this.replaceDreamTags(dream.id, dream.tagIds);
      await this.replaceDreamAudioAsset(dream.id, dream.audioPath, dream.createdAt);
      await this.syncDreamDrawingAssets(dream.id, dream.drawingPath, dream.createdAt);
    });
  }

  async getById(id: string): Promise<Dream | null> {
    const row = await this.database.getFirstAsync<DreamRow>(
      `
SELECT id, created_at, quality, title, content
FROM dreams
WHERE id = ?;
`,
      [id],
    );

    if (!row) {
      return null;
    }

    return this.hydrateDream(row);
  }

  async update(dream: Dream): Promise<void> {
    await this.withTransaction(async () => {
      await this.database.runAsync(
        `
UPDATE dreams
SET created_at = ?, quality = ?, title = ?, content = ?
WHERE id = ?;
`,
        [
          dream.createdAt,
          dream.quality,
          normalizeText(dream.title),
          normalizeText(dream.content),
          dream.id,
        ],
      );

      await this.replaceDreamTags(dream.id, dream.tagIds);
      await this.replaceDreamAudioAsset(dream.id, dream.audioPath, dream.createdAt);
      await this.syncDreamDrawingAssets(dream.id, dream.drawingPath, dream.createdAt);
    });
  }

  async delete(id: string): Promise<void> {
    await this.withTransaction(async () => {
      await this.database.runAsync('DELETE FROM dream_tags WHERE dream_id = ?;', [id]);
      await this.database.runAsync('DELETE FROM dream_assets WHERE dream_id = ?;', [id]);
      await this.database.runAsync('DELETE FROM dreams WHERE id = ?;', [id]);
    });
  }

  async listAssetsByDreamId(dreamId: string): Promise<readonly DreamAsset[]> {
    const rows = await this.database.getAllAsync<DreamAssetRow>(
      `
SELECT id, dream_id, asset_type, file_path, created_at
FROM dream_assets
WHERE dream_id = ?
ORDER BY created_at DESC, id DESC;
`,
      [dreamId],
    );

    return rows.map(mapDreamAssetRow);
  }

  async deleteAsset(dreamId: string, assetId: string): Promise<void> {
    await this.database.runAsync('DELETE FROM dream_assets WHERE dream_id = ? AND id = ?;', [
      dreamId,
      assetId,
    ]);
  }

  async listByCreatedAtRange(query: DreamHistoryQuery): Promise<readonly Dream[]> {
    const statement = [
      'SELECT id, created_at, quality, title, content',
      'FROM dreams',
      'WHERE created_at >= ? AND created_at <= ?',
      'ORDER BY created_at DESC, id DESC',
    ];
    const params: SqliteBindParams = [query.startCreatedAt, query.endCreatedAt];
    const mutableParams = [...params];
    const limit = normalizePositiveInteger(query.limit);
    const offset = normalizePositiveInteger(query.offset);

    if (limit !== undefined) {
      statement.push('LIMIT ?');
      mutableParams.push(limit);
    }

    if (offset !== undefined) {
      if (limit === undefined) {
        statement.push('LIMIT -1');
      }
      statement.push('OFFSET ?');
      mutableParams.push(offset);
    }

    const rows = await this.database.getAllAsync<DreamRow>(
      `${statement.join('\n')};`,
      mutableParams,
    );

    return Promise.all(rows.map((row) => this.hydrateDream(row)));
  }

  async countByCreatedAtRange(startCreatedAt: number, endCreatedAt: number): Promise<number> {
    const row = await this.database.getFirstAsync<CountRow>(
      `
SELECT COUNT(*) AS count
FROM dreams
WHERE created_at >= ? AND created_at <= ?;
`,
      [startCreatedAt, endCreatedAt],
    );

    return getCountValue(row);
  }

  async countDrawingsByDreamId(dreamId: string): Promise<number> {
    const row = await this.database.getFirstAsync<CountRow>(
      `
SELECT COUNT(*) AS count
FROM dream_assets
WHERE dream_id = ? AND asset_type = ?;
`,
      [dreamId, 'DRAWING'],
    );

    return getCountValue(row);
  }

  private async withTransaction(work: () => Promise<void>): Promise<void> {
    await this.database.execAsync('BEGIN IMMEDIATE TRANSACTION;');

    try {
      await work();
      await this.database.execAsync('COMMIT;');
    } catch (error) {
      await this.database.execAsync('ROLLBACK;');
      throw error;
    }
  }

  private async replaceDreamTags(dreamId: string, tagIds: readonly string[]): Promise<void> {
    await this.database.runAsync('DELETE FROM dream_tags WHERE dream_id = ?;', [dreamId]);

    const uniqueTagIds = uniqueValues(tagIds);

    await uniqueTagIds.reduce<Promise<void>>(async (chain, tagId) => {
      await chain;
      await this.database.runAsync('INSERT INTO dream_tags (dream_id, tag_id) VALUES (?, ?);', [
        dreamId,
        tagId,
      ]);
    }, Promise.resolve());
  }

  private async replaceDreamAudioAsset(
    dreamId: string,
    filePath: string | undefined,
    createdAt: number,
  ): Promise<void> {
    await this.database.runAsync(
      'DELETE FROM dream_assets WHERE dream_id = ? AND asset_type = ?;',
      [dreamId, 'AUDIO'],
    );

    if (!filePath) {
      return;
    }

    await this.database.runAsync(
      `
INSERT INTO dream_assets (id, dream_id, asset_type, file_path, created_at)
VALUES (?, ?, ?, ?, ?);
`,
      [`${dreamId}:AUDIO`, dreamId, 'AUDIO', filePath, createdAt],
    );
  }

  private async syncDreamDrawingAssets(
    dreamId: string,
    filePath: string | undefined,
    baseCreatedAt: number,
  ): Promise<void> {
    if (!filePath) {
      await this.database.runAsync(
        'DELETE FROM dream_assets WHERE dream_id = ? AND asset_type = ?;',
        [dreamId, 'DRAWING'],
      );
      return;
    }

    const drawingAssets = await this.listDreamAssetsByType(dreamId, 'DRAWING');
    const latestDrawingPath = drawingAssets[0]?.filePath;

    if (latestDrawingPath === filePath) {
      return;
    }

    const nextDrawingSequence = drawingAssets.length + 1;
    const createdAt = baseCreatedAt + drawingAssets.length;

    await this.database.runAsync(
      `
INSERT INTO dream_assets (id, dream_id, asset_type, file_path, created_at)
VALUES (?, ?, ?, ?, ?);
`,
      [`${dreamId}:DRAWING:${nextDrawingSequence}`, dreamId, 'DRAWING', filePath, createdAt],
    );
  }

  private async listDreamAssetsByType(
    dreamId: string,
    assetType: DreamAssetType,
  ): Promise<readonly DreamAsset[]> {
    const assets = await this.listAssetsByDreamId(dreamId);
    return assets.filter((asset) => asset.type === assetType);
  }

  private async hydrateDream(row: DreamRow): Promise<Dream> {
    const [tagIds, assets] = await Promise.all([
      this.getDreamTagIds(row.id),
      this.getDreamAssets(row.id),
    ]);

    return mapDreamRow(row, tagIds, assets);
  }

  private async getDreamTagIds(dreamId: string): Promise<string[]> {
    const rows = await this.database.getAllAsync<DreamTagRow>(
      `
SELECT tag_id
FROM dream_tags
WHERE dream_id = ?
ORDER BY rowid ASC;
`,
      [dreamId],
    );

    return rows.map((row) => row.tag_id);
  }

  private async getDreamAssets(dreamId: string): Promise<DreamAssets> {
    const assets = await this.listAssetsByDreamId(dreamId);

    return assets.reduce<DreamAssets>((current, asset) => {
      if (asset.type === 'AUDIO' && current.audioPath === undefined) {
        return { ...current, audioPath: asset.filePath };
      }

      if (asset.type === 'DRAWING' && current.drawingPath === undefined) {
        return { ...current, drawingPath: asset.filePath };
      }

      return current;
    }, {});
  }
}
