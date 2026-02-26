import {
  validateDream,
  type Clock,
  type Dream,
  type FeatureGateDecision,
  type ValidationIssue,
} from '../../domain';
import type { DreamRepository, LicenseRepository, UsageLogRepository } from '../repositories';

import {
  resolveFeatureGateFromRepositories,
  type FeatureGateResolverDependencies,
} from './featureGateResolver';

export interface DreamDrawingExporter {
  exportToPngBase64(): Promise<string>;
}

export interface DreamDrawingFileStore {
  saveBase64Png(input: { drawingId: string; base64Png: string }): Promise<string>;
}

export interface SaveDreamDrawingInput {
  dreamId: string;
  exporter: DreamDrawingExporter;
}

interface SaveDreamDrawingSuccess {
  ok: true;
  dream: Dream;
  drawingPath: string;
  decision: FeatureGateDecision;
}

interface SaveDreamDrawingDreamNotFound {
  ok: false;
  code: 'DREAM_NOT_FOUND';
}

interface SaveDreamDrawingQuotaReached {
  ok: false;
  code: 'DRAWING_QUOTA_REACHED';
  decision: FeatureGateDecision;
}

interface SaveDreamDrawingExportFailed {
  ok: false;
  code: 'DRAWING_EXPORT_FAILED';
}

interface SaveDreamDrawingStorageFailed {
  ok: false;
  code: 'DRAWING_SAVE_FAILED';
}

interface SaveDreamDrawingValidationFailed {
  ok: false;
  code: 'VALIDATION_FAILED';
  issues: readonly ValidationIssue[];
}

export type SaveDreamDrawingResult =
  | SaveDreamDrawingSuccess
  | SaveDreamDrawingDreamNotFound
  | SaveDreamDrawingQuotaReached
  | SaveDreamDrawingExportFailed
  | SaveDreamDrawingStorageFailed
  | SaveDreamDrawingValidationFailed;

function createDrawingId(dreamId: string, existingDrawingsCount: number): string {
  return `${dreamId}-drawing-${existingDrawingsCount + 1}`;
}

export class SaveDreamDrawingUseCase {
  private readonly featureGateDependencies: FeatureGateResolverDependencies;

  constructor(
    private readonly dreamRepository: DreamRepository,
    licenseRepository: LicenseRepository,
    usageLogRepository: UsageLogRepository,
    clock: Clock,
    private readonly drawingFileStore: DreamDrawingFileStore,
  ) {
    this.featureGateDependencies = {
      dreamRepository,
      licenseRepository,
      usageLogRepository,
      clock,
    };
  }

  async execute(input: SaveDreamDrawingInput): Promise<SaveDreamDrawingResult> {
    const dream = await this.dreamRepository.getById(input.dreamId);

    if (!dream) {
      return {
        ok: false,
        code: 'DREAM_NOT_FOUND',
      };
    }

    const drawingsPerDreamCount = await this.dreamRepository.countDrawingsByDreamId(dream.id);
    const decision = await resolveFeatureGateFromRepositories(this.featureGateDependencies, {
      drawingsPerDreamCount,
    });

    if (!decision.canAddDrawing) {
      return {
        ok: false,
        code: 'DRAWING_QUOTA_REACHED',
        decision,
      };
    }

    let drawingBase64: string;

    try {
      drawingBase64 = (await input.exporter.exportToPngBase64()).trim();
    } catch {
      return {
        ok: false,
        code: 'DRAWING_EXPORT_FAILED',
      };
    }

    if (drawingBase64.length === 0) {
      return {
        ok: false,
        code: 'DRAWING_EXPORT_FAILED',
      };
    }

    let drawingPath: string;

    try {
      drawingPath = await this.drawingFileStore.saveBase64Png({
        drawingId: createDrawingId(dream.id, drawingsPerDreamCount),
        base64Png: drawingBase64,
      });
    } catch {
      return {
        ok: false,
        code: 'DRAWING_SAVE_FAILED',
      };
    }

    const updatedDream: Dream = {
      ...dream,
      drawingPath,
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
      dream: updatedDream,
      drawingPath,
      decision,
    };
  }
}
