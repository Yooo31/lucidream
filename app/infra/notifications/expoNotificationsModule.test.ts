describe('createDefaultExpoNotificationsModule', () => {
  afterEach(() => {
    jest.resetModules();
    jest.dontMock('expo-notifications');
  });

  it('returns an unavailable module when expo-notifications cannot be required', async () => {
    jest.doMock('expo-notifications', () => {
      throw new Error('Requiring unknown module "expo-notifications".');
    });

    await new Promise<void>((resolve, reject) => {
      jest.isolateModules(() => {
        try {
          // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
          const { createDefaultExpoNotificationsModule } = require('./expoNotificationsModule');
          const notificationsModule = createDefaultExpoNotificationsModule();

          notificationsModule
            .requestPermissionsAsync()
            .then(() => reject(new Error('Expected unavailable notifications module to reject.')))
            .catch((error: unknown) => {
              expect(error).toBeInstanceOf(Error);
              expect((error as Error).message).toContain('expo-notifications');
              resolve();
            });
        } catch (error) {
          reject(error);
        }
      });
    });
  });
});
