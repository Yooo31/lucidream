import type { Dream } from './Dream';
import type { Tag } from './Tag';
import {
  isDreamQuality,
  isLicenseType,
  isNonEmptyString,
  isPositiveUnixTimestamp,
  isTagType,
  isUsageLogType,
  validateDream,
  validateTag,
} from './validation';

describe('domain validation helpers', () => {
  describe('primitive validators', () => {
    it('checks non-empty strings', () => {
      expect(isNonEmptyString('dream')).toBe(true);
      expect(isNonEmptyString('   ')).toBe(false);
    });

    it('checks positive unix timestamps', () => {
      expect(isPositiveUnixTimestamp(1)).toBe(true);
      expect(isPositiveUnixTimestamp(0)).toBe(false);
      expect(isPositiveUnixTimestamp(10.5)).toBe(false);
    });

    it('validates enum-like domain values', () => {
      expect(isDreamQuality('LUCID')).toBe(true);
      expect(isDreamQuality('BAD')).toBe(false);

      expect(isTagType('EMOTION')).toBe(true);
      expect(isTagType('INVALID')).toBe(false);

      expect(isLicenseType('PRO')).toBe(true);
      expect(isLicenseType('ENTERPRISE')).toBe(false);

      expect(isUsageLogType('DREAM_CREATED')).toBe(true);
      expect(isUsageLogType('AUDIO_PLAYED')).toBe(true);
      expect(isUsageLogType('SOMETHING_ELSE')).toBe(false);
    });
  });

  describe('tag validation', () => {
    it('returns no issues for a valid tag', () => {
      const tag: Tag = {
        id: 'tag-1',
        name: 'Flying',
        type: 'THEME',
        createdAt: 1733000000000,
      };

      expect(validateTag(tag)).toEqual([]);
    });

    it('returns issues for invalid tag fields', () => {
      const tag = {
        id: ' ',
        name: '',
        type: 'BAD',
        createdAt: -1,
      } as unknown as Tag;

      const issues = validateTag(tag);

      expect(issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'id' }),
          expect.objectContaining({ field: 'name' }),
          expect.objectContaining({ field: 'type' }),
          expect.objectContaining({ field: 'createdAt' }),
        ]),
      );
    });
  });

  describe('dream validation', () => {
    it('returns no issues for a valid dream', () => {
      const dream: Dream = {
        id: 'dream-1',
        createdAt: 1733000000000,
        quality: 'VIVID',
        tagIds: ['tag-1'],
        content: 'I became lucid and flew over a city.',
      };

      expect(validateDream(dream)).toEqual([]);
    });

    it('accepts media-only dream content', () => {
      const dream: Dream = {
        id: 'dream-2',
        createdAt: 1733000000000,
        quality: 'CLEAR',
        tagIds: [],
        audioPath: 'file:///audio/dream-2.m4a',
      };

      expect(validateDream(dream)).toEqual([]);
    });

    it('returns issues for invalid dream fields', () => {
      const dream = {
        id: '',
        createdAt: 0,
        quality: 'INVALID',
        tagIds: ['tag-1', ''],
      } as unknown as Dream;

      const issues = validateDream(dream);

      expect(issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'id' }),
          expect.objectContaining({ field: 'createdAt' }),
          expect.objectContaining({ field: 'quality' }),
          expect.objectContaining({ field: 'content' }),
          expect.objectContaining({ field: 'tagIds' }),
        ]),
      );
    });
  });
});
