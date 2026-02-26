import { isNonEmptyString, type DreamAsset, type ValidationIssue } from '../../domain';
import type { DreamRepository } from '../repositories';

export interface ListDreamAssetsInput {
  dreamId: string;
}

interface ListDreamAssetsSuccess {
  ok: true;
  assets: readonly DreamAsset[];
}

interface ListDreamAssetsValidationFailure {
  ok: false;
  code: 'VALIDATION_FAILED';
  issues: readonly ValidationIssue[];
}

export type ListDreamAssetsResult = ListDreamAssetsSuccess | ListDreamAssetsValidationFailure;

function validateInput(input: ListDreamAssetsInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!isNonEmptyString(input.dreamId)) {
    issues.push({
      field: 'dreamId',
      message: 'dreamId is required.',
    });
  }

  return issues;
}

export class ListDreamAssetsUseCase {
  constructor(private readonly dreamRepository: DreamRepository) {}

  async execute(input: ListDreamAssetsInput): Promise<ListDreamAssetsResult> {
    const issues = validateInput(input);

    if (issues.length > 0) {
      return {
        ok: false,
        code: 'VALIDATION_FAILED',
        issues,
      };
    }

    const assets = await this.dreamRepository.listAssetsByDreamId(input.dreamId);

    return {
      ok: true,
      assets,
    };
  }
}
