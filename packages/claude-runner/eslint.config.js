import { nodeConfig } from '@cyrus/eslint-config';

export default [
  ...nodeConfig,
  {
    ignores: ['node_modules/**', 'dist/**', '.prettierrc.js']
  }
];
