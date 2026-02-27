describe('createDefaultAudioModule', () => {
  afterEach(() => {
    jest.resetModules();
    jest.dontMock('expo-av');
  });

  it('returns an unavailable module when expo-av cannot be required', async () => {
    jest.doMock('expo-av', () => {
      throw new Error('Requiring unknown module "expo-av".');
    });

    await new Promise<void>((resolve, reject) => {
      jest.isolateModules(() => {
        try {
          // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
          const { createDefaultAudioModule } = require('./expoAudioModule');
          const audioModule = createDefaultAudioModule();

          audioModule
            .requestPermissionsAsync()
            .then(() => reject(new Error('Expected unavailable audio module to reject.')))
            .catch((error: unknown) => {
              expect(error).toBeInstanceOf(Error);
              expect((error as Error).message).toContain('expo-av');
              resolve();
            });
        } catch (error) {
          reject(error);
        }
      });
    });
  });
});
