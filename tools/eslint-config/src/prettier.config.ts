export const prettierConfig = {
  semi: true,
  trailingComma: 'es5' as const,
  singleQuote: true,
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  bracketSpacing: true,
  arrowParens: 'always' as const,
  endOfLine: 'lf' as const,
  quoteProps: 'as-needed' as const,
  bracketSameLine: false,
  proseWrap: 'preserve' as const,
  htmlWhitespaceSensitivity: 'css' as const,
  embeddedLanguageFormatting: 'auto' as const,
};

export default prettierConfig;