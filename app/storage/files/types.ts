export const STORAGE_ROOT_FOLDER = 'lucidream';
export const AUDIO_FOLDER = 'audio';
export const DRAWINGS_FOLDER = 'drawings';
export const EXPORTS_FOLDER = 'exports';

export type StorageRootUri = `${string}/${typeof STORAGE_ROOT_FOLDER}`;
export type AudioDirectoryUri = `${StorageRootUri}/${typeof AUDIO_FOLDER}`;
export type DrawingDirectoryUri = `${StorageRootUri}/${typeof DRAWINGS_FOLDER}`;
export type ExportDirectoryUri = `${StorageRootUri}/${typeof EXPORTS_FOLDER}`;
export type StorageDirectoryUri = AudioDirectoryUri | DrawingDirectoryUri | ExportDirectoryUri;

export type AudioFilePath = `${AudioDirectoryUri}/${string}.m4a`;
export type DrawingFilePath = `${DrawingDirectoryUri}/${string}.png`;
export type CsvFilePath = `${ExportDirectoryUri}/${string}.csv`;
export type PdfFilePath = `${ExportDirectoryUri}/${string}.pdf`;
export type StoredFilePath = AudioFilePath | DrawingFilePath | CsvFilePath | PdfFilePath;

export type StoredFileKind = 'audio' | 'drawing' | 'export' | 'exportPdf';
export type FileContentEncoding = 'utf8' | 'base64';

export interface SaveFileInput {
  id: string;
  kind: StoredFileKind;
  content: string;
  encoding?: FileContentEncoding;
}

export interface CopyFileFromUriInput {
  id: string;
  kind: StoredFileKind;
  sourceUri: string;
}

export interface StoragePaths {
  rootDir: StorageRootUri;
  audioDir: AudioDirectoryUri;
  drawingsDir: DrawingDirectoryUri;
  exportsDir: ExportDirectoryUri;
}

export interface FileStorage {
  ensureDir(directory: StorageDirectoryUri): Promise<void>;
  save(input: SaveFileInput): Promise<StoredFilePath>;
  copyFromUri(input: CopyFileFromUriInput): Promise<StoredFilePath>;
  read(path: StoredFilePath, encoding?: FileContentEncoding): Promise<string>;
  delete(path: StoredFilePath): Promise<void>;
}
