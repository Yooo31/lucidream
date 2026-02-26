import {
  AUDIO_FOLDER,
  DRAWINGS_FOLDER,
  EXPORTS_FOLDER,
  STORAGE_ROOT_FOLDER,
  type AudioFilePath,
  type CsvFilePath,
  type DrawingFilePath,
  type StorageDirectoryUri,
  type StoragePaths,
  type StorageRootUri,
  type StoredFileKind,
  type StoredFilePath,
} from './types';

function trimTrailingSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function sanitizeFileId(id: string): string {
  const normalized = id.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  if (normalized.length === 0) {
    throw new Error('File id must contain at least one valid character.');
  }

  return normalized;
}

export function createStoragePaths(documentDirectory: string): StoragePaths {
  const normalizedDocumentDirectory = trimTrailingSlash(documentDirectory.trim());
  if (normalizedDocumentDirectory.length === 0) {
    throw new Error('documentDirectory is required to build storage paths.');
  }

  const rootDir = `${normalizedDocumentDirectory}/${STORAGE_ROOT_FOLDER}` as StorageRootUri;
  const audioDir = `${rootDir}/${AUDIO_FOLDER}` as StoragePaths['audioDir'];
  const drawingsDir = `${rootDir}/${DRAWINGS_FOLDER}` as StoragePaths['drawingsDir'];
  const exportsDir = `${rootDir}/${EXPORTS_FOLDER}` as StoragePaths['exportsDir'];

  return {
    rootDir,
    audioDir,
    drawingsDir,
    exportsDir,
  };
}

export function directoryForKind(paths: StoragePaths, kind: StoredFileKind): StorageDirectoryUri {
  if (kind === 'audio') {
    return paths.audioDir;
  }

  if (kind === 'drawing') {
    return paths.drawingsDir;
  }

  return paths.exportsDir;
}

export function createStoredFilePath(
  paths: StoragePaths,
  kind: StoredFileKind,
  id: string,
): StoredFilePath {
  const safeId = sanitizeFileId(id);

  if (kind === 'audio') {
    return `${paths.audioDir}/${safeId}.m4a` as AudioFilePath;
  }

  if (kind === 'drawing') {
    return `${paths.drawingsDir}/${safeId}.png` as DrawingFilePath;
  }

  return `${paths.exportsDir}/${safeId}.csv` as CsvFilePath;
}
