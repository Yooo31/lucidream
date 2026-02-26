import { SystemClock, type Clock } from '../domain';
import {
  AddTagToDreamUseCase,
  CreateDreamUseCase,
  ListDreamsUseCase,
  RecordUsageLogUseCase,
  type DreamRepository,
  type LicenseRepository,
  type TagRepository,
  type UsageLogRepository,
} from '../services';
import {
  initializeDatabase as initializeSqliteDatabase,
  SqliteDreamRepository,
  SqliteLicenseRepository,
  SqliteTagRepository,
  SqliteUsageLogRepository,
  type SqliteDatabase,
} from '../storage/sqlite';

export interface AppRepositories {
  dreamRepository: DreamRepository;
  tagRepository: TagRepository;
  usageLogRepository: UsageLogRepository;
  licenseRepository: LicenseRepository;
}

export interface AppUseCases {
  createDreamUseCase: CreateDreamUseCase;
  listDreamsUseCase: ListDreamsUseCase;
  addTagToDreamUseCase: AddTagToDreamUseCase;
  recordUsageLogUseCase: RecordUsageLogUseCase;
}

export interface CompositionRoot {
  database: SqliteDatabase;
  clock: Clock;
  repositories: AppRepositories;
  useCases: AppUseCases;
}

export type InitializeDatabase = () => Promise<SqliteDatabase>;

export interface CreateCompositionRootDependencies {
  initializeDatabase?: InitializeDatabase;
  clock?: Clock;
}

export type CreateCompositionRoot = (
  dependencies?: CreateCompositionRootDependencies,
) => Promise<CompositionRoot>;

export const createCompositionRoot: CreateCompositionRoot = async (dependencies = {}) => {
  const initializeDatabase =
    dependencies.initializeDatabase ?? (async () => initializeSqliteDatabase());
  const database = await initializeDatabase();
  const clock = dependencies.clock ?? new SystemClock();

  const repositories: AppRepositories = {
    dreamRepository: new SqliteDreamRepository(database),
    tagRepository: new SqliteTagRepository(database),
    usageLogRepository: new SqliteUsageLogRepository(database),
    licenseRepository: new SqliteLicenseRepository(database),
  };

  const useCases: AppUseCases = {
    createDreamUseCase: new CreateDreamUseCase(
      repositories.dreamRepository,
      repositories.licenseRepository,
      repositories.usageLogRepository,
      clock,
    ),
    listDreamsUseCase: new ListDreamsUseCase(
      repositories.dreamRepository,
      repositories.licenseRepository,
      repositories.usageLogRepository,
      clock,
    ),
    addTagToDreamUseCase: new AddTagToDreamUseCase(
      repositories.dreamRepository,
      repositories.tagRepository,
    ),
    recordUsageLogUseCase: new RecordUsageLogUseCase(repositories.usageLogRepository, clock),
  };

  return {
    database,
    clock,
    repositories,
    useCases,
  };
};
