import {
  AUDIO_FOLDER,
  DRAWINGS_FOLDER,
  STORAGE_ROOT_FOLDER,
  type AudioFilePath,
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

  return {
    rootDir,
    audioDir,
    drawingsDir,
  };
}

export function directoryForKind(paths: StoragePaths, kind: StoredFileKind): StorageDirectoryUri {
  return kind === 'audio' ? paths.audioDir : paths.drawingsDir;
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

  return `${paths.drawingsDir}/${safeId}.png` as DrawingFilePath;
}
