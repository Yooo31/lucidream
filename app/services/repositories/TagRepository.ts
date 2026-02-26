import type { Tag, TagType } from '../../domain';

export interface TagRepository {
  create(tag: Tag): Promise<void>;
  getById(id: string): Promise<Tag | null>;
  update(tag: Tag): Promise<void>;
  delete(id: string): Promise<void>;
  listAll(): Promise<readonly Tag[]>;
  listByType(type: TagType): Promise<readonly Tag[]>;
  listByDreamId(dreamId: string): Promise<readonly Tag[]>;
}
