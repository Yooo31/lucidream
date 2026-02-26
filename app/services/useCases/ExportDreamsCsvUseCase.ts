import type { Clock, Dream, DreamQuality, FeatureGateDecision, Tag } from '../../domain';
import type {
  DreamRepository,
  LicenseRepository,
  TagRepository,
  UsageLogRepository,
} from '../repositories';

import {
  getUtcTrailingDayRange,
  resolveFeatureGateFromRepositories,
  type FeatureGateResolverDependencies,
} from './featureGateResolver';

const CSV_HEADERS = ['date', 'title', 'story', 'lucidity', 'quality', 'tags'] as const;

export interface DreamCsvRecord {
  date: string;
  title: string;
  story: string;
  lucidity: string;
  quality: string;
  tags: string;
}

function escapeCsvCell(value: string): string {
  const normalized = value.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const escaped = normalized.replace(/"/g, '""');
  const needsQuotes = /[",\n]/.test(normalized);

  return needsQuotes ? `"${escaped}"` : escaped;
}

function toCsvRow(cells: readonly string[]): string {
  return cells.map((cell) => escapeCsvCell(cell)).join(',');
}

export function createDreamsCsv(records: readonly DreamCsvRecord[]): string {
  const lines = [
    toCsvRow([...CSV_HEADERS]),
    ...records.map((record) =>
      toCsvRow([
        record.date,
        record.title,
        record.story,
        record.lucidity,
        record.quality,
        record.tags,
      ]),
    ),
  ];

  return `${lines.join('\n')}\n`;
}

export interface DreamsCsvFileStore {
  saveUtf8Csv(input: { fileId: string; content: string }): Promise<string>;
}

interface ExportDreamsCsvSuccess {
  ok: true;
  filePath: string;
  exportedDreamCount: number;
  decision: FeatureGateDecision;
}

interface ExportDreamsCsvNotAvailable {
  ok: false;
  code: 'EXPORT_NOT_AVAILABLE';
  decision: FeatureGateDecision;
}

interface ExportDreamsCsvFailed {
  ok: false;
  code: 'EXPORT_FAILED';
}

export type ExportDreamsCsvResult =
  | ExportDreamsCsvSuccess
  | ExportDreamsCsvNotAvailable
  | ExportDreamsCsvFailed;

function resolveLucidityValue(quality: DreamQuality): string {
  return quality === 'LUCID' ? 'LUCID' : 'NOT_LUCID';
}

function buildTagNamesById(tags: readonly Tag[]): ReadonlyMap<string, string> {
  return new Map(tags.map((tag) => [tag.id, tag.name]));
}

function resolveTagLabel(dream: Dream, tagNamesById: ReadonlyMap<string, string>): string {
  const names = dream.tagIds
    .map((tagId) => tagNamesById.get(tagId))
    .filter((name): name is string => name !== undefined);

  return names.join('|');
}

function toDreamCsvRecord(dream: Dream, tagNamesById: ReadonlyMap<string, string>): DreamCsvRecord {
  return {
    date: new Date(dream.createdAt).toISOString(),
    title: dream.title ?? '',
    story: dream.content ?? '',
    lucidity: resolveLucidityValue(dream.quality),
    quality: dream.quality,
    tags: resolveTagLabel(dream, tagNamesById),
  };
}

export class ExportDreamsCsvUseCase {
  private readonly featureGateDependencies: FeatureGateResolverDependencies;

  constructor(
    private readonly dreamRepository: DreamRepository,
    private readonly tagRepository: TagRepository,
    licenseRepository: LicenseRepository,
    usageLogRepository: UsageLogRepository,
    private readonly clock: Clock,
    private readonly fileStore: DreamsCsvFileStore,
  ) {
    this.featureGateDependencies = {
      dreamRepository,
      licenseRepository,
      usageLogRepository,
      clock,
    };
  }

  async execute(): Promise<ExportDreamsCsvResult> {
    const decision = await resolveFeatureGateFromRepositories(this.featureGateDependencies);

    if (!decision.exportEnabled) {
      return {
        ok: false,
        code: 'EXPORT_NOT_AVAILABLE',
        decision,
      };
    }

    const now = this.clock.now();
    const range =
      decision.maxHistoryDays === null
        ? {
            startCreatedAt: 1,
            endCreatedAt: now,
          }
        : {
            startCreatedAt: getUtcTrailingDayRange(now, decision.maxHistoryDays).startCreatedAt,
            endCreatedAt: now,
          };

    const [dreams, tags] = await Promise.all([
      this.dreamRepository.listByCreatedAtRange(range),
      this.tagRepository.listAll(),
    ]);
    const tagNamesById = buildTagNamesById(tags);
    const records = dreams.map((dream) => toDreamCsvRecord(dream, tagNamesById));
    const content = createDreamsCsv(records);
    const fileId = `dreams-${this.clock.todayKey()}-${now}`;

    try {
      const filePath = await this.fileStore.saveUtf8Csv({
        fileId,
        content,
      });

      return {
        ok: true,
        filePath,
        exportedDreamCount: dreams.length,
        decision,
      };
    } catch {
      return {
        ok: false,
        code: 'EXPORT_FAILED',
      };
    }
  }
}
