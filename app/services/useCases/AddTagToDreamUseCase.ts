import { validateDream, type Dream, type ValidationIssue } from '../../domain';
import type { DreamRepository, TagRepository } from '../repositories';

export interface AddTagToDreamInput {
  dreamId: string;
  tagId: string;
}

interface AddTagToDreamSuccess {
  ok: true;
  added: boolean;
  dream: Dream;
}

interface AddTagToDreamDreamNotFound {
  ok: false;
  code: 'DREAM_NOT_FOUND';
}

interface AddTagToDreamTagNotFound {
  ok: false;
  code: 'TAG_NOT_FOUND';
}

interface AddTagToDreamValidationFailure {
  ok: false;
  code: 'VALIDATION_FAILED';
  issues: readonly ValidationIssue[];
}

export type AddTagToDreamResult =
  | AddTagToDreamSuccess
  | AddTagToDreamDreamNotFound
  | AddTagToDreamTagNotFound
  | AddTagToDreamValidationFailure;

function addUniqueTagIds(tagIds: readonly string[], tagId: string): string[] {
  return Array.from(new Set([...tagIds, tagId]));
}

export class AddTagToDreamUseCase {
  constructor(
    private readonly dreamRepository: DreamRepository,
    private readonly tagRepository: TagRepository,
  ) {}

  async execute(input: AddTagToDreamInput): Promise<AddTagToDreamResult> {
    const dream = await this.dreamRepository.getById(input.dreamId);

    if (!dream) {
      return {
        ok: false,
        code: 'DREAM_NOT_FOUND',
      };
    }

    const tag = await this.tagRepository.getById(input.tagId);

    if (!tag) {
      return {
        ok: false,
        code: 'TAG_NOT_FOUND',
      };
    }

    if (dream.tagIds.includes(tag.id)) {
      return {
        ok: true,
        added: false,
        dream,
      };
    }

    const updatedDream: Dream = {
      ...dream,
      tagIds: addUniqueTagIds(dream.tagIds, tag.id),
    };

    const issues = validateDream(updatedDream);

    if (issues.length > 0) {
      return {
        ok: false,
        code: 'VALIDATION_FAILED',
        issues,
      };
    }

    await this.dreamRepository.update(updatedDream);

    return {
      ok: true,
      added: true,
      dream: updatedDream,
    };
  }
}
