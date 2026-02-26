/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/?(*.)+(spec|test).ts?(x)'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^expo-file-system/legacy$': '<rootDir>/node_modules/expo-file-system/legacy.ts',
  },
  collectCoverageFrom: ['app/**/*.{ts,tsx}', '!**/*.d.ts'],
};
