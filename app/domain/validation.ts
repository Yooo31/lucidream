import { DREAM_QUALITIES, type Dream, type DreamQuality } from './Dream';
import { LICENSE_TYPES, type LicenseType } from './LicenseType';
import { TAG_TYPES, type Tag, type TagType } from './Tag';
import { USAGE_LOG_TYPES, type UsageLogType } from './UsageLogType';

export interface ValidationIssue {
  field: string;
  message: string;
}

function hasValue<T extends string>(allowedValues: readonly T[], value: string): value is T {
  return (allowedValues as readonly string[]).includes(value);
}

export function isNonEmptyString(value: string): boolean {
  return value.trim().length > 0;
}

export function isPositiveUnixTimestamp(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

export function isDreamQuality(value: string): value is DreamQuality {
  return hasValue(DREAM_QUALITIES, value);
}

export function isTagType(value: string): value is TagType {
  return hasValue(TAG_TYPES, value);
}

export function isLicenseType(value: string): value is LicenseType {
  return hasValue(LICENSE_TYPES, value);
}

export function isUsageLogType(value: string): value is UsageLogType {
  return hasValue(USAGE_LOG_TYPES, value);
}

export function validateTag(tag: Tag): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!isNonEmptyString(tag.id)) {
    issues.push({ field: 'id', message: 'Tag id is required.' });
  }

  if (!isNonEmptyString(tag.name)) {
    issues.push({ field: 'name', message: 'Tag name is required.' });
  }

  if (!isTagType(tag.type)) {
    issues.push({ field: 'type', message: 'Tag type is invalid.' });
  }

  if (!isPositiveUnixTimestamp(tag.createdAt)) {
    issues.push({ field: 'createdAt', message: 'Tag createdAt must be a positive integer.' });
  }

  return issues;
}

export function validateDream(dream: Dream): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!isNonEmptyString(dream.id)) {
    issues.push({ field: 'id', message: 'Dream id is required.' });
  }

  if (!isPositiveUnixTimestamp(dream.createdAt)) {
    issues.push({
      field: 'createdAt',
      message: 'Dream createdAt must be a positive integer.',
    });
  }

  if (!isDreamQuality(dream.quality)) {
    issues.push({ field: 'quality', message: 'Dream quality is invalid.' });
  }

  const hasContent =
    isNonEmptyString(dream.title ?? '') ||
    isNonEmptyString(dream.content ?? '') ||
    isNonEmptyString(dream.audioPath ?? '') ||
    isNonEmptyString(dream.drawingPath ?? '');

  if (!hasContent) {
    issues.push({
      field: 'content',
      message: 'Dream must include at least one text or media value.',
    });
  }

  if (dream.tagIds.some((tagId) => !isNonEmptyString(tagId))) {
    issues.push({
      field: 'tagIds',
      message: 'Dream tagIds must only include non-empty ids.',
    });
  }

  return issues;
}
