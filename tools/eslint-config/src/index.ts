import type { Linter } from 'eslint';
import js from '@eslint/js';
import globals from 'globals';
// @ts-ignore - No types available
import prettierConfig from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';
import simpleImportSortPlugin from 'eslint-plugin-simple-import-sort';
import tsEslint from 'typescript-eslint';

export const settings = {
  'import/resolver': {
    node: {
      extensions: ['.js', '.jsx', '.mjs', '.ts', '.tsx']
    },
    typescript: {}
  }
} satisfies Linter.Config['settings'];

const baseFiles: Linter.Config['files'] = ['**/*.{js,mjs,cjs,ts,jsx,tsx}'];

// Base configuration for all Node.js projects
export const nodeConfig: Array<Linter.Config> = [
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      'eslint.config.*',
      '**/*.d.ts'
    ]
  },
  ...[
    js.configs.recommended,
    ...tsEslint.configs.recommended,
    prettierConfig
  ].map((config) => ({ ...config, files: baseFiles })),
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2022
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: false
        }
      }
    },
    files: baseFiles,
    linterOptions: {
      reportUnusedInlineConfigs: 'error',
      reportUnusedDisableDirectives: 'error'
    },
    plugins: {
      'simple-import-sort': simpleImportSortPlugin,
      prettier: prettierPlugin
    },
    rules: {
      // TypeScript rules (disable problematic ones)
      '@typescript-eslint/consistent-type-imports': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }],
      
      // Import sorting
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      
      // Prettier integration
      'prettier/prettier': 'error',
      
      // General rules
      'no-console': 'warn',
      'prefer-const': 'error',
      'no-var': 'error'
    },
    settings
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off'
    }
  }
];

// Configuration for Electron/React projects
export const electronConfig: Array<Linter.Config> = [
  ...nodeConfig,
  {
    files: ['**/*.{jsx,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      }
    },
    settings: {
      ...settings,
      react: {
        version: 'detect'
      }
    }
  }
];

// Configuration for CLI/server projects
export const cliConfig: Array<Linter.Config> = [
  ...nodeConfig,
  {
    files: ['**/*.mjs'],
    languageOptions: {
      globals: {
        ...globals.node
      }
    },
    rules: {
      // Allow console in CLI applications
      'no-console': 'off'
    }
  }
];

// Configuration for Cloudflare Workers
export const workerConfig: Array<Linter.Config> = [
  ...nodeConfig,
  {
    files: baseFiles,
    languageOptions: {
      globals: {
        ...globals.serviceworker
      }
    },
    rules: {
      // Workers have different global context
      'no-restricted-globals': 'off'
    }
  }
];

export default nodeConfig;