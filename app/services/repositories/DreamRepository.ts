import type { Dream, DreamAsset } from '../../domain';

export interface DreamHistoryQuery {
  startCreatedAt: number;
  endCreatedAt: number;
  limit?: number;
  offset?: number;
}

export interface DreamRepository {
  create(dream: Dream): Promise<void>;
  getById(id: string): Promise<Dream | null>;
  update(dream: Dream): Promise<void>;
  delete(id: string): Promise<void>;
  listAssetsByDreamId(dreamId: string): Promise<readonly DreamAsset[]>;
  deleteAsset(dreamId: string, assetId: string): Promise<void>;
  listByCreatedAtRange(query: DreamHistoryQuery): Promise<readonly Dream[]>;
  countByCreatedAtRange(startCreatedAt: number, endCreatedAt: number): Promise<number>;
  countDrawingsByDreamId(dreamId: string): Promise<number>;
}
