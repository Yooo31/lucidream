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

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const PAGE_TOP = 794;
const PAGE_BOTTOM = 52;
const PAGE_LEFT = 52;
const PAGE_CONTENT_WIDTH = PAGE_WIDTH - PAGE_LEFT * 2;

const TITLE_FONT_SIZE = 18;
const META_FONT_SIZE = 10;
const SECTION_FONT_SIZE = 12;
const BODY_FONT_SIZE = 11;

const TITLE_LEADING = 26;
const META_LEADING = 16;
const SECTION_LEADING = 16;
const BODY_LEADING = 14;
const SPACING_LEADING = 8;

interface PdfLineSpec {
  text: string;
  fontSize: number;
  leading: number;
  indent: number;
}

interface PdfRenderedLine {
  text: string;
  fontSize: number;
  x: number;
  y: number;
}

interface PdfPage {
  lines: readonly PdfRenderedLine[];
}

export interface DreamPdfRecord {
  date: string;
  title: string;
  story: string;
  lucidity: string;
  quality: string;
  tags: string;
}

export interface DreamPdfGeneratorInput {
  generatedAtIso: string;
  records: readonly DreamPdfRecord[];
}

export type DreamPdfGenerator = (input: DreamPdfGeneratorInput) => string;

function toAsciiText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '?')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapePdfString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function splitLongWord(word: string, maxLength: number): string[] {
  if (word.length <= maxLength) {
    return [word];
  }

  const chunks: string[] = [];
  let index = 0;

  while (index < word.length) {
    chunks.push(word.slice(index, index + maxLength));
    index += maxLength;
  }

  return chunks;
}

function wrapText(value: string, maxLength: number): string[] {
  const normalized = toAsciiText(value);
  if (normalized.length === 0) {
    return [];
  }

  const words = normalized
    .split(' ')
    .flatMap((word) => splitLongWord(word, maxLength))
    .filter((word) => word.length > 0);

  if (words.length === 0) {
    return [];
  }

  const lines: string[] = [];
  let current = '';

  words.forEach((word) => {
    if (current.length === 0) {
      current = word;
      return;
    }

    const candidate = `${current} ${word}`;
    if (candidate.length <= maxLength) {
      current = candidate;
      return;
    }

    lines.push(current);
    current = word;
  });

  if (current.length > 0) {
    lines.push(current);
  }

  return lines;
}

function estimateMaxChars(fontSize: number, indent: number): number {
  const availableWidth = Math.max(20, PAGE_CONTENT_WIDTH - indent);
  const averageCharacterWidth = fontSize * 0.52;
  return Math.max(8, Math.floor(availableWidth / averageCharacterWidth));
}

function appendWrapped(
  lines: PdfLineSpec[],
  label: string,
  value: string,
  options: { fontSize: number; leading: number; indent: number },
): void {
  const maxChars = estimateMaxChars(options.fontSize, options.indent);
  const wrapped = wrapText(`${label}${value}`, maxChars);

  if (wrapped.length === 0) {
    lines.push({
      text: `${label}(none)`,
      fontSize: options.fontSize,
      leading: options.leading,
      indent: options.indent,
    });
    return;
  }

  wrapped.forEach((line) => {
    lines.push({
      text: line,
      fontSize: options.fontSize,
      leading: options.leading,
      indent: options.indent,
    });
  });
}

function toJournalLines(input: DreamPdfGeneratorInput): PdfLineSpec[] {
  const lines: PdfLineSpec[] = [];

  lines.push({
    text: 'LuciDream Dream Journal',
    fontSize: TITLE_FONT_SIZE,
    leading: TITLE_LEADING,
    indent: 0,
  });
  lines.push({
    text: `Generated locally: ${toAsciiText(input.generatedAtIso)}`,
    fontSize: META_FONT_SIZE,
    leading: META_LEADING,
    indent: 0,
  });
  lines.push({
    text: `Dreams exported: ${input.records.length}`,
    fontSize: META_FONT_SIZE,
    leading: META_LEADING,
    indent: 0,
  });
  lines.push({
    text: '',
    fontSize: BODY_FONT_SIZE,
    leading: SPACING_LEADING,
    indent: 0,
  });

  if (input.records.length === 0) {
    lines.push({
      text: 'No dreams found in your current local history window.',
      fontSize: BODY_FONT_SIZE,
      leading: BODY_LEADING,
      indent: 0,
    });

    return lines;
  }

  input.records.forEach((record, index) => {
    lines.push({
      text: `Dream ${index + 1}`,
      fontSize: SECTION_FONT_SIZE,
      leading: SECTION_LEADING,
      indent: 0,
    });

    appendWrapped(lines, 'Date: ', record.date, {
      fontSize: BODY_FONT_SIZE,
      leading: BODY_LEADING,
      indent: 0,
    });
    appendWrapped(lines, 'Title: ', record.title, {
      fontSize: BODY_FONT_SIZE,
      leading: BODY_LEADING,
      indent: 0,
    });
    appendWrapped(lines, 'Lucidity: ', record.lucidity, {
      fontSize: BODY_FONT_SIZE,
      leading: BODY_LEADING,
      indent: 0,
    });
    appendWrapped(lines, 'Quality: ', record.quality, {
      fontSize: BODY_FONT_SIZE,
      leading: BODY_LEADING,
      indent: 0,
    });
    appendWrapped(lines, 'Tags: ', record.tags, {
      fontSize: BODY_FONT_SIZE,
      leading: BODY_LEADING,
      indent: 0,
    });

    lines.push({
      text: 'Story:',
      fontSize: BODY_FONT_SIZE,
      leading: BODY_LEADING,
      indent: 0,
    });

    const storyLines = wrapText(record.story, estimateMaxChars(BODY_FONT_SIZE, 12));
    if (storyLines.length === 0) {
      lines.push({
        text: '(none)',
        fontSize: BODY_FONT_SIZE,
        leading: BODY_LEADING,
        indent: 12,
      });
    } else {
      storyLines.forEach((storyLine) => {
        lines.push({
          text: storyLine,
          fontSize: BODY_FONT_SIZE,
          leading: BODY_LEADING,
          indent: 12,
        });
      });
    }

    lines.push({
      text: '',
      fontSize: BODY_FONT_SIZE,
      leading: SPACING_LEADING,
      indent: 0,
    });
  });

  return lines;
}

function paginateLines(lines: readonly PdfLineSpec[]): readonly PdfPage[] {
  const pages: PdfPage[] = [];
  let currentLines: PdfRenderedLine[] = [];
  let y = PAGE_TOP;

  const finalizePage = () => {
    pages.push({
      lines: currentLines,
    });
    currentLines = [];
    y = PAGE_TOP;
  };

  lines.forEach((line) => {
    if (y - line.leading < PAGE_BOTTOM) {
      finalizePage();
    }

    if (line.text.length > 0) {
      currentLines.push({
        text: line.text,
        fontSize: line.fontSize,
        x: PAGE_LEFT + line.indent,
        y,
      });
    }

    y -= line.leading;
  });

  if (currentLines.length > 0 || pages.length === 0) {
    finalizePage();
  }

  return pages;
}

function createPageContentStream(page: PdfPage): string {
  return page.lines
    .map(
      (line) =>
        `BT /F1 ${line.fontSize} Tf 1 0 0 1 ${line.x.toFixed(2)} ${line.y.toFixed(2)} Tm (${escapePdfString(
          line.text,
        )}) Tj ET`,
    )
    .join('\n');
}

function createPdfDocument(contentStreams: readonly string[]): string {
  const pageCount = contentStreams.length;
  const objects: string[] = [];
  const firstPageObjectId = 4;
  const objectCount = firstPageObjectId - 1 + pageCount * 2;
  const pageObjectIds: number[] = [];

  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] = '<< /Type /Pages /Kids [] /Count 0 >>';
  objects[3] = '<< /Type /Font /Subtype /Type1 /Name /F1 /BaseFont /Helvetica >>';

  contentStreams.forEach((stream, index) => {
    const pageObjectId = firstPageObjectId + index * 2;
    const contentObjectId = pageObjectId + 1;
    pageObjectIds.push(pageObjectId);

    objects[pageObjectId] = [
      '<<',
      '/Type /Page',
      '/Parent 2 0 R',
      `/MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}]`,
      '/Resources << /Font << /F1 3 0 R >> >>',
      `/Contents ${contentObjectId} 0 R`,
      '>>',
    ].join(' ');

    objects[contentObjectId] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  });

  objects[2] = [
    '<< /Type /Pages',
    `/Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(' ')}]`,
    `/Count ${pageCount} >>`,
  ].join(' ');

  let output = '%PDF-1.4\n';
  const offsets = new Map<number, number>();

  for (let objectId = 1; objectId <= objectCount; objectId += 1) {
    const body = objects[objectId] ?? '';
    offsets.set(objectId, output.length);
    output += `${objectId} 0 obj\n${body}\nendobj\n`;
  }

  const xrefStart = output.length;
  output += `xref\n0 ${objectCount + 1}\n`;
  output += '0000000000 65535 f \n';

  for (let objectId = 1; objectId <= objectCount; objectId += 1) {
    const objectOffset = offsets.get(objectId);
    if (objectOffset === undefined) {
      throw new Error('PDF object offset missing while building xref table.');
    }
    output += `${objectOffset.toString().padStart(10, '0')} 00000 n \n`;
  }

  output += `trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return output;
}

export function createDreamJournalPdf(input: DreamPdfGeneratorInput): string {
  const lines = toJournalLines(input);
  const pages = paginateLines(lines);
  const streams = pages.map((page) => createPageContentStream(page));
  return createPdfDocument(streams);
}

export interface DreamsPdfFileStore {
  saveUtf8Pdf(input: { fileId: string; content: string }): Promise<string>;
}

interface ExportDreamsPdfSuccess {
  ok: true;
  filePath: string;
  exportedDreamCount: number;
  decision: FeatureGateDecision;
}

interface ExportDreamsPdfNotAvailable {
  ok: false;
  code: 'EXPORT_NOT_AVAILABLE';
  decision: FeatureGateDecision;
}

interface ExportDreamsPdfFailed {
  ok: false;
  code: 'EXPORT_FAILED';
}

export type ExportDreamsPdfResult =
  | ExportDreamsPdfSuccess
  | ExportDreamsPdfNotAvailable
  | ExportDreamsPdfFailed;

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

  return names.join(' | ');
}

function toDreamPdfRecord(dream: Dream, tagNamesById: ReadonlyMap<string, string>): DreamPdfRecord {
  return {
    date: new Date(dream.createdAt).toISOString(),
    title: dream.title ?? '',
    story: dream.content ?? '',
    lucidity: resolveLucidityValue(dream.quality),
    quality: dream.quality,
    tags: resolveTagLabel(dream, tagNamesById),
  };
}

export interface ExportDreamsPdfUseCaseOptions {
  generator?: DreamPdfGenerator;
}

export class ExportDreamsPdfUseCase {
  private readonly featureGateDependencies: FeatureGateResolverDependencies;

  private readonly generator: DreamPdfGenerator;

  constructor(
    private readonly dreamRepository: DreamRepository,
    private readonly tagRepository: TagRepository,
    licenseRepository: LicenseRepository,
    usageLogRepository: UsageLogRepository,
    private readonly clock: Clock,
    private readonly fileStore: DreamsPdfFileStore,
    options: ExportDreamsPdfUseCaseOptions = {},
  ) {
    this.featureGateDependencies = {
      dreamRepository,
      licenseRepository,
      usageLogRepository,
      clock,
    };
    this.generator = options.generator ?? createDreamJournalPdf;
  }

  async execute(): Promise<ExportDreamsPdfResult> {
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
    const records = dreams.map((dream) => toDreamPdfRecord(dream, tagNamesById));
    const content = this.generator({
      generatedAtIso: new Date(now).toISOString(),
      records,
    });
    const fileId = `dreams-${this.clock.todayKey()}-${now}`;

    try {
      const filePath = await this.fileStore.saveUtf8Pdf({
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
