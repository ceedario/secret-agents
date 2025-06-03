import simpleImportSort from 'eslint-plugin-simple-import-sort'

export default [
  {
    files: ['**/*.mjs', '**/*.js'],
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      'simple-import-sort/exports': 'error',
      'simple-import-sort/imports': 'error',
    },
    linterOptions: {
      reportUnusedInlineConfigs: 'error',
      reportUnusedDisableDirectives: 'error',
    },
  },
]