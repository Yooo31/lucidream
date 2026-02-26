import { createStoragePaths, createStoredFilePath, directoryForKind } from './paths';

describe('file storage path generation', () => {
  it('builds stable local asset and export directories from documentDirectory', () => {
    const paths = createStoragePaths('file:///data/user/0/host.exp.exponent/files/');

    expect(paths.rootDir).toBe('file:///data/user/0/host.exp.exponent/files/lucidream');
    expect(paths.audioDir).toBe('file:///data/user/0/host.exp.exponent/files/lucidream/audio');
    expect(paths.drawingsDir).toBe(
      'file:///data/user/0/host.exp.exponent/files/lucidream/drawings',
    );
    expect(paths.exportsDir).toBe('file:///data/user/0/host.exp.exponent/files/lucidream/exports');
  });

  it('generates .m4a/.png/.csv/.pdf paths by storage kind', () => {
    const paths = createStoragePaths('file:///data/user/0/host.exp.exponent/files');

    const audioPath = createStoredFilePath(paths, 'audio', 'dream-1');
    const drawingPath = createStoredFilePath(paths, 'drawing', 'dream-1');
    const exportPath = createStoredFilePath(paths, 'export', 'dream-1');
    const exportPdfPath = createStoredFilePath(paths, 'exportPdf', 'dream-1');

    expect(audioPath).toBe(
      'file:///data/user/0/host.exp.exponent/files/lucidream/audio/dream-1.m4a',
    );
    expect(drawingPath).toBe(
      'file:///data/user/0/host.exp.exponent/files/lucidream/drawings/dream-1.png',
    );
    expect(exportPath).toBe(
      'file:///data/user/0/host.exp.exponent/files/lucidream/exports/dream-1.csv',
    );
    expect(exportPdfPath).toBe(
      'file:///data/user/0/host.exp.exponent/files/lucidream/exports/dream-1.pdf',
    );
  });

  it('returns the correct target directory for each file kind', () => {
    const paths = createStoragePaths('file:///sandbox/files');

    expect(directoryForKind(paths, 'audio')).toBe('file:///sandbox/files/lucidream/audio');
    expect(directoryForKind(paths, 'drawing')).toBe('file:///sandbox/files/lucidream/drawings');
    expect(directoryForKind(paths, 'export')).toBe('file:///sandbox/files/lucidream/exports');
    expect(directoryForKind(paths, 'exportPdf')).toBe('file:///sandbox/files/lucidream/exports');
  });
});
