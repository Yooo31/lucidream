import { isNonEmptyString, type Dream, type DreamAsset, type ValidationIssue } from '../../domain';
import type { DreamRepository } from '../repositories';

export interface DreamAssetFileStore {
  delete(path: string): Promise<void>;
}

export interface DeleteDreamAssetInput {
  dreamId: string;
  assetId: string;
}

interface DeleteDreamAssetSuccess {
  ok: true;
  dream: Dream;
  assets: readonly DreamAsset[];
  deletedAsset: DreamAsset;
}

interface DeleteDreamAssetValidationFailure {
  ok: false;
  code: 'VALIDATION_FAILED';
  issues: readonly ValidationIssue[];
}

interface DeleteDreamAssetNotFound {
  ok: false;
  code: 'ASSET_NOT_FOUND';
}

interface DeleteDreamAssetDreamNotFound {
  ok: false;
  code: 'DREAM_NOT_FOUND';
}

interface DeleteDreamAssetFileDeleteFailed {
  ok: false;
  code: 'ASSET_FILE_DELETE_FAILED';
  dream: Dream;
  assets: readonly DreamAsset[];
  deletedAsset: DreamAsset;
}

export type DeleteDreamAssetResult =
  | DeleteDreamAssetSuccess
  | DeleteDreamAssetValidationFailure
  | DeleteDreamAssetNotFound
  | DeleteDreamAssetDreamNotFound
  | DeleteDreamAssetFileDeleteFailed;

function validateInput(input: DeleteDreamAssetInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!isNonEmptyString(input.dreamId)) {
    issues.push({
      field: 'dreamId',
      message: 'dreamId is required.',
    });
  }

  if (!isNonEmptyString(input.assetId)) {
    issues.push({
      field: 'assetId',
      message: 'assetId is required.',
    });
  }

  return issues;
}

export class DeleteDreamAssetUseCase {
  constructor(
    private readonly dreamRepository: DreamRepository,
    private readonly assetFileStore: DreamAssetFileStore,
  ) {}

  async execute(input: DeleteDreamAssetInput): Promise<DeleteDreamAssetResult> {
    const issues = validateInput(input);

    if (issues.length > 0) {
      return {
        ok: false,
        code: 'VALIDATION_FAILED',
        issues,
      };
    }

    const existingAssets = await this.dreamRepository.listAssetsByDreamId(input.dreamId);
    const deletedAsset = existingAssets.find((asset) => asset.id === input.assetId);

    if (!deletedAsset) {
      return {
        ok: false,
        code: 'ASSET_NOT_FOUND',
      };
    }

    await this.dreamRepository.deleteAsset(input.dreamId, input.assetId);

    const dreamAfterDelete = await this.dreamRepository.getById(input.dreamId);

    if (!dreamAfterDelete) {
      return {
        ok: false,
        code: 'DREAM_NOT_FOUND',
      };
    }

    const assetsAfterDelete = await this.dreamRepository.listAssetsByDreamId(input.dreamId);

    try {
      await this.assetFileStore.delete(deletedAsset.filePath);
    } catch {
      return {
        ok: false,
        code: 'ASSET_FILE_DELETE_FAILED',
        dream: dreamAfterDelete,
        assets: assetsAfterDelete,
        deletedAsset,
      };
    }

    return {
      ok: true,
      dream: dreamAfterDelete,
      assets: assetsAfterDelete,
      deletedAsset,
    };
  }
}
