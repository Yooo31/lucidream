import type { Dream, LicenseType, Tag, TagType, UsageLog, UsageLogType } from '../../../domain';
import type {
  DreamHistoryQuery,
  DreamRepository,
  LicenseRepository,
  TagRepository,
  UsageLogRepository,
} from '../../repositories';

export function createDreamRepositoryMock(): jest.Mocked<DreamRepository> {
  return {
    create: jest.fn<Promise<void>, [Dream]>(async () => undefined),
    getById: jest.fn<Promise<Dream | null>, [string]>(async () => null),
    update: jest.fn<Promise<void>, [Dream]>(async () => undefined),
    delete: jest.fn<Promise<void>, [string]>(async () => undefined),
    listByCreatedAtRange: jest.fn<Promise<readonly Dream[]>, [DreamHistoryQuery]>(async () => []),
    countByCreatedAtRange: jest.fn<Promise<number>, [number, number]>(async () => 0),
    countDrawingsByDreamId: jest.fn<Promise<number>, [string]>(async () => 0),
  };
}

export function createTagRepositoryMock(): jest.Mocked<TagRepository> {
  return {
    create: jest.fn<Promise<void>, [Tag]>(async () => undefined),
    getById: jest.fn<Promise<Tag | null>, [string]>(async () => null),
    update: jest.fn<Promise<void>, [Tag]>(async () => undefined),
    delete: jest.fn<Promise<void>, [string]>(async () => undefined),
    listAll: jest.fn<Promise<readonly Tag[]>, []>(async () => []),
    listByType: jest.fn<Promise<readonly Tag[]>, [TagType]>(async () => []),
    listByDreamId: jest.fn<Promise<readonly Tag[]>, [string]>(async () => []),
  };
}

export function createUsageLogRepositoryMock(): jest.Mocked<UsageLogRepository> {
  return {
    create: jest.fn<Promise<void>, [UsageLog]>(async () => undefined),
    getById: jest.fn<Promise<UsageLog | null>, [string]>(async () => null),
    update: jest.fn<Promise<void>, [UsageLog]>(async () => undefined),
    delete: jest.fn<Promise<void>, [string]>(async () => undefined),
    listByTypeAndCreatedAtRange: jest.fn<
      Promise<readonly UsageLog[]>,
      [UsageLogType, number, number]
    >(async () => []),
    countByTypeAndCreatedAtRange: jest.fn<Promise<number>, [UsageLogType, number, number]>(
      async () => 0,
    ),
  };
}

export function createLicenseRepositoryMock(
  initialLicenseType: LicenseType | null = 'FREE',
): jest.Mocked<LicenseRepository> {
  return {
    create: jest.fn<Promise<void>, [LicenseType]>(async () => undefined),
    getCurrent: jest.fn(async () => initialLicenseType),
    update: jest.fn<Promise<void>, [LicenseType]>(async () => undefined),
    delete: jest.fn<Promise<void>, []>(async () => undefined),
  };
}
