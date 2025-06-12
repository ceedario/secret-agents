import { cliConfig } from '@cyrus/eslint-config';

export default [
  ...cliConfig,
  {
    ignores: ['node_modules/**', 'repositories.example.json', '.prettierrc.js']
  }
];