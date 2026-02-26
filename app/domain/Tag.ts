export const TAG_TYPES = ['CHARACTER', 'LOCATION', 'EMOTION', 'ACTION', 'THEME'] as const;

export type TagType = (typeof TAG_TYPES)[number];

export interface Tag {
  id: string;
  name: string;
  type: TagType;
  createdAt: number;
}
