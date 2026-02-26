import { ExpoFileStorage, type ExpoFileSystemModule } from './ExpoFileStorage';
import type { StoredFilePath } from './types';

interface MockExpoFileSystemModule extends ExpoFileSystemModule {
  makeDirectoryAsyncMock: jest.Mock<Promise<void>, [string, { intermediates?: boolean }?]>;
  writeAsStringAsyncMock: jest.Mock<Promise<void>, [string, string, { encoding?: string }?]>;
  copyAsyncMock: jest.Mock<Promise<void>, [{ from: string; to: string }]>;
  readAsStringAsyncMock: jest.Mock<Promise<string>, [string, { encoding?: string }?]>;
  getInfoAsyncMock: jest.Mock<Promise<{ exists: boolean }>, [string]>;
  deleteAsyncMock: jest.Mock<Promise<void>, [string, { idempotent?: boolean }?]>;
}

function createMockFileSystemModule(options?: { exists?: boolean }): MockExpoFileSystemModule {
  const makeDirectoryAsyncMock = jest.fn<Promise<void>, [string, { intermediates?: boolean }?]>();
  makeDirectoryAsyncMock.mockResolvedValue(undefined);

  const writeAsStringAsyncMock = jest.fn<Promise<void>, [string, string, { encoding?: string }?]>();
  writeAsStringAsyncMock.mockResolvedValue(undefined);

  const copyAsyncMock = jest.fn<Promise<void>, [{ from: string; to: string }]>();
  copyAsyncMock.mockResolvedValue(undefined);

  const readAsStringAsyncMock = jest.fn<Promise<string>, [string, { encoding?: string }?]>();
  readAsStringAsyncMock.mockResolvedValue('file-content');

  const getInfoAsyncMock = jest.fn<Promise<{ exists: boolean }>, [string]>();
  getInfoAsyncMock.mockResolvedValue({ exists: options?.exists ?? false });

  const deleteAsyncMock = jest.fn<Promise<void>, [string, { idempotent?: boolean }?]>();
  deleteAsyncMock.mockResolvedValue(undefined);

  return {
    documentDirectory: 'file:///data/user/0/host.exp.exponent/files',
    EncodingType: {
      UTF8: 'utf8',
      Base64: 'base64',
    },
    makeDirectoryAsync: (uri: string, option?: { intermediates?: boolean }) =>
      makeDirectoryAsyncMock(uri, option),
    writeAsStringAsync: (
      uri: string,
      content: string,
      option?: {
        encoding?: string;
      },
    ) => writeAsStringAsyncMock(uri, content, option),
    copyAsync: (option: { from: string; to: string }) => copyAsyncMock(option),
    readAsStringAsync: (
      uri: string,
      option?: {
        encoding?: string;
      },
    ) => readAsStringAsyncMock(uri, option),
    getInfoAsync: (uri: string) => getInfoAsyncMock(uri),
    deleteAsync: (uri: string, option?: { idempotent?: boolean }) => deleteAsyncMock(uri, option),
    makeDirectoryAsyncMock,
    writeAsStringAsyncMock,
    copyAsyncMock,
    readAsStringAsyncMock,
    getInfoAsyncMock,
    deleteAsyncMock,
  };
}

describe('ExpoFileStorage.copyFromUri', () => {
  it('copies source audio file into local lucidream audio directory', async () => {
    const fileSystemModule = createMockFileSystemModule();
    const storage = new ExpoFileStorage({
      fileSystemModule,
      documentDirectory: 'file:///sandbox',
    });

    const storedPath = await storage.copyFromUri({
      id: 'dream-42',
      kind: 'audio',
      sourceUri: 'file:///cache/audio-temp.m4a',
    });

    expect(storedPath).toBe('file:///sandbox/lucidream/audio/dream-42.m4a');
    expect(fileSystemModule.makeDirectoryAsyncMock).toHaveBeenCalledWith(
      'file:///sandbox/lucidream/audio',
      { intermediates: true },
    );
    expect(fileSystemModule.copyAsyncMock).toHaveBeenCalledWith({
      from: 'file:///cache/audio-temp.m4a',
      to: 'file:///sandbox/lucidream/audio/dream-42.m4a',
    });
  });
});

describe('ExpoFileStorage.delete', () => {
  const audioPath = 'file:///sandbox/lucidream/audio/dream-42.m4a' as StoredFilePath;

  it('does not call deleteAsync when the file does not exist', async () => {
    const fileSystemModule = createMockFileSystemModule({ exists: false });
    const storage = new ExpoFileStorage({
      fileSystemModule,
      documentDirectory: 'file:///sandbox',
    });

    await storage.delete(audioPath);

    expect(fileSystemModule.getInfoAsyncMock).toHaveBeenCalledWith(audioPath);
    expect(fileSystemModule.deleteAsyncMock).not.toHaveBeenCalled();
  });

  it('calls deleteAsync with idempotent flag when the file exists', async () => {
    const fileSystemModule = createMockFileSystemModule({ exists: true });
    const storage = new ExpoFileStorage({
      fileSystemModule,
      documentDirectory: 'file:///sandbox',
    });

    await storage.delete(audioPath);

    expect(fileSystemModule.getInfoAsyncMock).toHaveBeenCalledWith(audioPath);
    expect(fileSystemModule.deleteAsyncMock).toHaveBeenCalledWith(audioPath, {
      idempotent: true,
    });
  });
});
