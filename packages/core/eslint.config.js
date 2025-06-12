import { nodeConfig } from '@cyrus/eslint-config';

export default [
  ...nodeConfig,
  {
    ignores: [
      'dist/**', 
      'node_modules/**', 
      'src/**/*.js', 
      'src/**/*.d.ts',
      '.prettierrc.js'
    ],
  },
];
