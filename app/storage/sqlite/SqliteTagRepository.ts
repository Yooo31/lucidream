import type { Tag, TagType } from '../../domain';
import type { TagRepository } from '../../services';

import type { SqliteDatabase, SqliteRow } from './types';

interface TagRow extends SqliteRow {
  id: string;
  name: string;
  type: TagType;
  created_at: number;
}

function mapTagRow(row: TagRow): Tag {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    createdAt: row.created_at,
  };
}

export class SqliteTagRepository implements TagRepository {
  constructor(private readonly database: SqliteDatabase) {}

  async create(tag: Tag): Promise<void> {
    await this.database.runAsync(
      `
INSERT INTO tags (id, name, type, created_at)
VALUES (?, ?, ?, ?);
`,
      [tag.id, tag.name, tag.type, tag.createdAt],
    );
  }

  async getById(id: string): Promise<Tag | null> {
    const row = await this.database.getFirstAsync<TagRow>(
      `
SELECT id, name, type, created_at
FROM tags
WHERE id = ?;
`,
      [id],
    );

    return row ? mapTagRow(row) : null;
  }

  async update(tag: Tag): Promise<void> {
    await this.database.runAsync(
      `
UPDATE tags
SET name = ?, type = ?, created_at = ?
WHERE id = ?;
`,
      [tag.name, tag.type, tag.createdAt, tag.id],
    );
  }

  async delete(id: string): Promise<void> {
    await this.database.runAsync('DELETE FROM tags WHERE id = ?;', [id]);
  }

  async listAll(): Promise<readonly Tag[]> {
    const rows = await this.database.getAllAsync<TagRow>(
      `
SELECT id, name, type, created_at
FROM tags
ORDER BY created_at DESC, id ASC;
`,
    );

    return rows.map(mapTagRow);
  }

  async listByType(type: TagType): Promise<readonly Tag[]> {
    const rows = await this.database.getAllAsync<TagRow>(
      `
SELECT id, name, type, created_at
FROM tags
WHERE type = ?
ORDER BY name ASC, id ASC;
`,
      [type],
    );

    return rows.map(mapTagRow);
  }

  async listByDreamId(dreamId: string): Promise<readonly Tag[]> {
    const rows = await this.database.getAllAsync<TagRow>(
      `
SELECT t.id, t.name, t.type, t.created_at
FROM tags t
INNER JOIN dream_tags dt ON dt.tag_id = t.id
WHERE dt.dream_id = ?
ORDER BY t.created_at DESC, t.id ASC;
`,
      [dreamId],
    );

    return rows.map(mapTagRow);
  }
}
