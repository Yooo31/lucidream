export const STORAGE_ROOT_FOLDER = 'lucidream';
export const AUDIO_FOLDER = 'audio';
export const DRAWINGS_FOLDER = 'drawings';

export type StorageRootUri = `${string}/${typeof STORAGE_ROOT_FOLDER}`;
export type AudioDirectoryUri = `${StorageRootUri}/${typeof AUDIO_FOLDER}`;
export type DrawingDirectoryUri = `${StorageRootUri}/${typeof DRAWINGS_FOLDER}`;
export type StorageDirectoryUri = AudioDirectoryUri | DrawingDirectoryUri;

export type AudioFilePath = `${AudioDirectoryUri}/${string}.m4a`;
export type DrawingFilePath = `${DrawingDirectoryUri}/${string}.png`;
export type StoredFilePath = AudioFilePath | DrawingFilePath;

export type StoredFileKind = 'audio' | 'drawing';
export type FileContentEncoding = 'utf8' | 'base64';

export interface SaveFileInput {
  id: string;
  kind: StoredFileKind;
  content: string;
  encoding?: FileContentEncoding;
}

export interface StoragePaths {
  rootDir: StorageRootUri;
  audioDir: AudioDirectoryUri;
  drawingsDir: DrawingDirectoryUri;
}

export interface FileStorage {
  ensureDir(directory: StorageDirectoryUri): Promise<void>;
  save(input: SaveFileInput): Promise<StoredFilePath>;
  read(path: StoredFilePath, encoding?: FileContentEncoding): Promise<string>;
  delete(path: StoredFilePath): Promise<void>;
}
