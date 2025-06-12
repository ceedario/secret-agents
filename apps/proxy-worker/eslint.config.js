import { workerConfig } from '@cyrus/eslint-config';

export default [
  ...workerConfig,
  {
    ignores: ['node_modules/**', 'dist/**', '.prettierrc.js'],
  },
];
