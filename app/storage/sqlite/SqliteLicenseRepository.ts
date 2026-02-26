import type { LicenseType } from '../../domain';
import type { LicenseRepository } from '../../services';

import type { SqliteDatabase, SqliteRow } from './types';

interface LicenseRow extends SqliteRow {
  license_type: LicenseType;
}

export class SqliteLicenseRepository implements LicenseRepository {
  constructor(private readonly database: SqliteDatabase) {}

  async create(licenseType: LicenseType): Promise<void> {
    await this.database.runAsync('INSERT INTO license (license_type) VALUES (?);', [licenseType]);
  }

  async getCurrent(): Promise<LicenseType | null> {
    const row = await this.database.getFirstAsync<LicenseRow>(
      `
SELECT license_type
FROM license
ORDER BY rowid DESC
LIMIT 1;
`,
    );

    return row?.license_type ?? null;
  }

  async update(licenseType: LicenseType): Promise<void> {
    await this.database.execAsync('BEGIN IMMEDIATE TRANSACTION;');

    try {
      await this.database.runAsync('DELETE FROM license;');
      await this.database.runAsync('INSERT INTO license (license_type) VALUES (?);', [licenseType]);
      await this.database.execAsync('COMMIT;');
    } catch (error) {
      await this.database.execAsync('ROLLBACK;');
      throw error;
    }
  }

  async delete(): Promise<void> {
    await this.database.runAsync('DELETE FROM license;');
  }
}
