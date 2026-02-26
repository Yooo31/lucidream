import { SystemClock, type Clock } from '../domain';
import { AudioPlayer, AudioRecorder } from '../infra/audio';
import type { ThemeSettingsRepository } from '../theme/ThemeSettingsRepository';
import {
  AddTagToDreamUseCase,
  CreateTagUseCase,
  CreateDreamUseCase,
  GetThemeSettingsUseCase,
  ListDreamTagsUseCase,
  ListDreamsUseCase,
  PlayDreamAudioUseCase,
  RecordUsageLogUseCase,
  RecordDreamAudioUseCase,
  SaveDreamDrawingUseCase,
  SaveThemeSettingsUseCase,
  SearchTagsUseCase,
  type DreamRepository,
  type LicenseRepository,
  type TagRepository,
  type UsageLogRepository,
} from '../services';
import { ExpoFileStorage } from '../storage/files';
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
  recordDreamAudioUseCase: RecordDreamAudioUseCase;
  playDreamAudioUseCase: PlayDreamAudioUseCase;
  saveDreamDrawingUseCase: SaveDreamDrawingUseCase;
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
  const audioRecorder = new AudioRecorder();
  const audioPlayer = new AudioPlayer();
  const fileStorage = new ExpoFileStorage();

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
    recordDreamAudioUseCase: new RecordDreamAudioUseCase(
      repositories.dreamRepository,
      repositories.usageLogRepository,
      clock,
      audioRecorder,
      {
        saveFromUri: async ({ dreamId, sourceUri }) =>
          fileStorage.copyFromUri({ id: dreamId, kind: 'audio', sourceUri }),
      },
    ),
    playDreamAudioUseCase: new PlayDreamAudioUseCase(
      repositories.dreamRepository,
      repositories.licenseRepository,
      repositories.usageLogRepository,
      clock,
      audioPlayer,
    ),
    saveDreamDrawingUseCase: new SaveDreamDrawingUseCase(
      repositories.dreamRepository,
      repositories.licenseRepository,
      repositories.usageLogRepository,
      clock,
      {
        saveBase64Png: async ({ drawingId, base64Png }) =>
          fileStorage.save({
            id: drawingId,
            kind: 'drawing',
            content: base64Png,
            encoding: 'base64',
          }),
      },
    ),
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
