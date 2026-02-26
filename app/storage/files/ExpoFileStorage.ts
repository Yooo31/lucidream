import * as ExpoFileSystem from 'expo-file-system/legacy';

import { createStoragePaths, createStoredFilePath, directoryForKind } from './paths';
import type {
  FileContentEncoding,
  FileStorage,
  SaveFileInput,
  StorageDirectoryUri,
  StoragePaths,
  StoredFilePath,
} from './types';

interface ExpoFileInfo {
  exists: boolean;
}

interface ExpoDirectoryOptions {
  intermediates?: boolean;
}

interface ExpoWriteOptions {
  encoding?: string;
}

interface ExpoReadOptions {
  encoding?: string;
}

interface ExpoDeleteOptions {
  idempotent?: boolean;
}

interface ExpoEncodingType {
  Base64: string;
  UTF8: string;
}

export interface ExpoFileSystemModule {
  documentDirectory: string | null;
  EncodingType: ExpoEncodingType;
  makeDirectoryAsync(uri: string, options?: ExpoDirectoryOptions): Promise<void>;
  writeAsStringAsync(uri: string, content: string, options?: ExpoWriteOptions): Promise<void>;
  readAsStringAsync(uri: string, options?: ExpoReadOptions): Promise<string>;
  getInfoAsync(uri: string): Promise<ExpoFileInfo>;
  deleteAsync(uri: string, options?: ExpoDeleteOptions): Promise<void>;
}

interface ExpoFileStorageOptions {
  fileSystemModule?: ExpoFileSystemModule;
  documentDirectory?: string;
}

const defaultFileSystemModule: ExpoFileSystemModule = {
  documentDirectory: ExpoFileSystem.documentDirectory,
  EncodingType: ExpoFileSystem.EncodingType,
  makeDirectoryAsync: ExpoFileSystem.makeDirectoryAsync,
  writeAsStringAsync: ExpoFileSystem.writeAsStringAsync,
  readAsStringAsync: ExpoFileSystem.readAsStringAsync,
  getInfoAsync: ExpoFileSystem.getInfoAsync,
  deleteAsync: ExpoFileSystem.deleteAsync,
};

const DEFAULT_ENCODING: FileContentEncoding = 'base64';

export class ExpoFileStorage implements FileStorage {
  private readonly fileSystemModule: ExpoFileSystemModule;

  private readonly storagePaths: StoragePaths;

  constructor(options: ExpoFileStorageOptions = {}) {
    const fileSystemModule = options.fileSystemModule ?? defaultFileSystemModule;
    const documentDirectory = options.documentDirectory ?? fileSystemModule.documentDirectory;

    if (!documentDirectory) {
      throw new Error('Expo file-system documentDirectory is unavailable.');
    }

    this.fileSystemModule = fileSystemModule;
    this.storagePaths = createStoragePaths(documentDirectory);
  }

  async ensureDir(directory: StorageDirectoryUri): Promise<void> {
    await this.fileSystemModule.makeDirectoryAsync(directory, { intermediates: true });
  }

  async save(input: SaveFileInput): Promise<StoredFilePath> {
    const directory = directoryForKind(this.storagePaths, input.kind);
    const path = createStoredFilePath(this.storagePaths, input.kind, input.id);

    await this.ensureDir(directory);
    await this.fileSystemModule.writeAsStringAsync(path, input.content, {
      encoding: this.toExpoEncoding(input.encoding ?? DEFAULT_ENCODING),
    });

    return path;
  }

  async read(
    path: StoredFilePath,
    encoding: FileContentEncoding = DEFAULT_ENCODING,
  ): Promise<string> {
    return this.fileSystemModule.readAsStringAsync(path, {
      encoding: this.toExpoEncoding(encoding),
    });
  }

  async delete(path: StoredFilePath): Promise<void> {
    const info = await this.fileSystemModule.getInfoAsync(path);
    if (!info.exists) {
      return;
    }

    await this.fileSystemModule.deleteAsync(path, { idempotent: true });
  }

  private toExpoEncoding(encoding: FileContentEncoding): string {
    return encoding === 'utf8'
      ? this.fileSystemModule.EncodingType.UTF8
      : this.fileSystemModule.EncodingType.Base64;
  }
}
