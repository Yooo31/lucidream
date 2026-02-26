import { SystemClock, type Clock } from '../domain';
import type { ThemeSettingsRepository } from '../theme/ThemeSettingsRepository';
import {
  AddTagToDreamUseCase,
  CreateTagUseCase,
  CreateDreamUseCase,
  GetThemeSettingsUseCase,
  ListDreamTagsUseCase,
  ListDreamsUseCase,
  RecordUsageLogUseCase,
  SaveThemeSettingsUseCase,
  SearchTagsUseCase,
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
  SqliteThemeSettingsRepository,
  SqliteUsageLogRepository,
  type SqliteDatabase,
} from '../storage/sqlite';

export interface AppRepositories {
  dreamRepository: DreamRepository;
  tagRepository: TagRepository;
  usageLogRepository: UsageLogRepository;
  licenseRepository: LicenseRepository;
  themeSettingsRepository: ThemeSettingsRepository;
}

export interface AppUseCases {
  createDreamUseCase: CreateDreamUseCase;
  listDreamsUseCase: ListDreamsUseCase;
  addTagToDreamUseCase: AddTagToDreamUseCase;
  searchTagsUseCase: SearchTagsUseCase;
  createTagUseCase: CreateTagUseCase;
  listDreamTagsUseCase: ListDreamTagsUseCase;
  recordUsageLogUseCase: RecordUsageLogUseCase;
  getThemeSettingsUseCase: GetThemeSettingsUseCase;
  saveThemeSettingsUseCase: SaveThemeSettingsUseCase;
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
    themeSettingsRepository: new SqliteThemeSettingsRepository(database),
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
    searchTagsUseCase: new SearchTagsUseCase(
      repositories.tagRepository,
      repositories.dreamRepository,
      repositories.licenseRepository,
      repositories.usageLogRepository,
      clock,
    ),
    createTagUseCase: new CreateTagUseCase(repositories.tagRepository, clock),
    listDreamTagsUseCase: new ListDreamTagsUseCase(repositories.tagRepository),
    recordUsageLogUseCase: new RecordUsageLogUseCase(repositories.usageLogRepository, clock),
    getThemeSettingsUseCase: new GetThemeSettingsUseCase(repositories.themeSettingsRepository),
    saveThemeSettingsUseCase: new SaveThemeSettingsUseCase(repositories.themeSettingsRepository),
  };

  return {
    database,
    clock,
    repositories,
    useCases,
  };
};
