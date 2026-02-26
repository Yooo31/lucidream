import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

export default [
  {
    ignores: [
      'node_modules/**',
      '.expo/**',
      'coverage/**',
      'dist/**',
      '*.config.js',
      '*.config.cjs',
      '*.config.mjs',
      'babel.config.js',
      'eslint.config.mjs',
      'jest.config.cjs',
      'commitlint.config.cjs',
    ],
  },
  ...compat.config({
    root: true,
    env: {
      es2021: true,
      jest: true,
    },
    plugins: ['@typescript-eslint', 'react', 'react-hooks', 'react-native', 'prettier'],
    extends: [
      'airbnb',
      'airbnb-typescript',
      'plugin:react/recommended',
      'plugin:react-hooks/recommended',
      'plugin:react-native/all',
      'plugin:@typescript-eslint/recommended',
      'plugin:prettier/recommended',
      'prettier',
    ],
    settings: {
      react: {
        version: 'detect',
      },
      'import/resolver': {
        typescript: true,
      },
    },
    rules: {
      'react/react-in-jsx-scope': 'off',
      'react/require-default-props': 'off',
      'react/jsx-props-no-spreading': 'off',
      'import/prefer-default-export': 'off',
      'import/extensions': [
        'error',
        'ignorePackages',
        {
          ts: 'never',
          tsx: 'never',
          js: 'never',
          jsx: 'never',
        },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
        },
      ],
      'prettier/prettier': 'error',
      'react-native/no-inline-styles': 'off',
      'react-native/no-color-literals': 'off',
    },
    overrides: [
      {
        files: ['**/*.ts', '**/*.tsx'],
        parser: '@typescript-eslint/parser',
        parserOptions: {
          ecmaVersion: 'latest',
          sourceType: 'module',
          project: ['./tsconfig.json'],
          tsconfigRootDir: __dirname,
        },
      },
      {
        files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
        rules: {
          'import/no-extraneous-dependencies': [
            'error',
            {
              devDependencies: true,
            },
          ],
        },
      },
    ],
  }),
];
