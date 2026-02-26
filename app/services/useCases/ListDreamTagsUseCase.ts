import { isNonEmptyString, type Tag, type ValidationIssue } from '../../domain';
import type { TagRepository } from '../repositories';

export interface ListDreamTagsInput {
  dreamId: string;
}

interface ListDreamTagsSuccess {
  ok: true;
  tags: readonly Tag[];
}

interface ListDreamTagsValidationFailure {
  ok: false;
  code: 'VALIDATION_FAILED';
  issues: readonly ValidationIssue[];
}

export type ListDreamTagsResult = ListDreamTagsSuccess | ListDreamTagsValidationFailure;

function validateInput(input: ListDreamTagsInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!isNonEmptyString(input.dreamId)) {
    issues.push({
      field: 'dreamId',
      message: 'dreamId is required.',
    });
  }

  return issues;
}

export class ListDreamTagsUseCase {
  constructor(private readonly tagRepository: TagRepository) {}

  async execute(input: ListDreamTagsInput): Promise<ListDreamTagsResult> {
    const issues = validateInput(input);

    if (issues.length > 0) {
      return {
        ok: false,
        code: 'VALIDATION_FAILED',
        issues,
      };
    }

    const tags = await this.tagRepository.listByDreamId(input.dreamId);

    return {
      ok: true,
      tags,
    };
  }
}
