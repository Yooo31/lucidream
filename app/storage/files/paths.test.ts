import { createStoragePaths, createStoredFilePath, directoryForKind } from './paths';

describe('file storage path generation', () => {
  it('builds stable audio and drawing directories from documentDirectory', () => {
    const paths = createStoragePaths('file:///data/user/0/host.exp.exponent/files/');

    expect(paths.rootDir).toBe('file:///data/user/0/host.exp.exponent/files/lucidream');
    expect(paths.audioDir).toBe('file:///data/user/0/host.exp.exponent/files/lucidream/audio');
    expect(paths.drawingsDir).toBe(
      'file:///data/user/0/host.exp.exponent/files/lucidream/drawings',
    );
  });

  it('generates .m4a path for audio and .png path for drawings', () => {
    const paths = createStoragePaths('file:///data/user/0/host.exp.exponent/files');

    const audioPath = createStoredFilePath(paths, 'audio', 'dream-1');
    const drawingPath = createStoredFilePath(paths, 'drawing', 'dream-1');

    expect(audioPath).toBe(
      'file:///data/user/0/host.exp.exponent/files/lucidream/audio/dream-1.m4a',
    );
    expect(drawingPath).toBe(
      'file:///data/user/0/host.exp.exponent/files/lucidream/drawings/dream-1.png',
    );
  });

  it('returns the correct target directory for each file kind', () => {
    const paths = createStoragePaths('file:///sandbox/files');

    expect(directoryForKind(paths, 'audio')).toBe('file:///sandbox/files/lucidream/audio');
    expect(directoryForKind(paths, 'drawing')).toBe('file:///sandbox/files/lucidream/drawings');
  });
});
