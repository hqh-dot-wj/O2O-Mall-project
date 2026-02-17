import rootConfig from '../../eslint.config.mjs';
import tseslint from 'typescript-eslint';

export default [
  ...rootConfig,
  {
    languageOptions: {
      parserOptions: {
        project: 'tsconfig.eslint.json',
        tsconfigRootDir: import.meta.dirname,
        sourceType: 'module',
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    ignores: ['dist/**', 'coverage/**', 'scripts/**/*.cjs'],
  },
];
