export const DREAM_QUALITIES = ['VAGUE', 'CLEAR', 'VIVID', 'LUCID'] as const;

export type DreamQuality = (typeof DREAM_QUALITIES)[number];

export interface Dream {
  id: string;
  createdAt: number;
  quality: DreamQuality;
  tagIds: readonly string[];
  title?: string;
  content?: string;
  audioPath?: string;
  drawingPath?: string;
}
