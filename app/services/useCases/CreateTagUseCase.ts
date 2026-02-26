import {
  validateTag,
  type Clock,
  type Tag,
  type TagType,
  type ValidationIssue,
} from '../../domain';
import type { TagRepository } from '../repositories';

export type TagIdGenerator = () => string;

function createDefaultTagId(): string {
  return `tag-${Date.now()}-${Math.floor(Math.random() * 1_000_000_000)}`;
}

function normalizeTagName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

export interface CreateTagInput {
  id?: string;
  name: string;
  type: TagType;
  createdAt?: number;
}

interface CreateTagSuccess {
  ok: true;
  created: boolean;
  tag: Tag;
}

interface CreateTagValidationFailure {
  ok: false;
  code: 'VALIDATION_FAILED';
  issues: readonly ValidationIssue[];
}

export type CreateTagResult = CreateTagSuccess | CreateTagValidationFailure;

export class CreateTagUseCase {
  constructor(
    private readonly tagRepository: TagRepository,
    private readonly clock: Clock,
    private readonly tagIdGenerator: TagIdGenerator = createDefaultTagId,
  ) {}

  async execute(input: CreateTagInput): Promise<CreateTagResult> {
    const normalizedName = normalizeTagName(input.name);
    const existingTag = await this.tagRepository.findByNormalizedNameAndType(
      input.type,
      normalizedName.toLowerCase(),
    );

    if (existingTag) {
      return {
        ok: true,
        created: false,
        tag: existingTag,
      };
    }

    const tag: Tag = {
      id: input.id ?? this.tagIdGenerator(),
      name: normalizedName,
      type: input.type,
      createdAt: input.createdAt ?? this.clock.now(),
    };

    const issues = validateTag(tag);

    if (issues.length > 0) {
      return {
        ok: false,
        code: 'VALIDATION_FAILED',
        issues,
      };
    }

    await this.tagRepository.create(tag);

    return {
      ok: true,
      created: true,
      tag,
    };
  }
}
