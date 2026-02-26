export const DREAM_ASSET_TYPES = ['AUDIO', 'DRAWING'] as const;

export type DreamAssetType = (typeof DREAM_ASSET_TYPES)[number];

export interface DreamAsset {
  id: string;
  dreamId: string;
  type: DreamAssetType;
  filePath: string;
  createdAt: number;
}
