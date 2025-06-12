/**
 * Claude CLI configuration helpers
 */

/**
 * List of all available tools in Claude Code
 */
export const availableTools = [
  // File system tools
  'Read',
  'Write',
  'Edit',
  'MultiEdit',
  'Glob',
  'Grep',
  'LS',

  // Execution tools
  'Bash',
  'Task',

  // Web tools
  'WebFetch',

  // Task management
  'TodoRead',
  'TodoWrite',

  // Notebook tools
  'NotebookRead',
  'NotebookEdit',

  // Utility tools
  'Batch',
] as const;

export type ToolName = (typeof availableTools)[number];

/**
 * Default read-only tools that are safe to enable
 */
export const readOnlyTools: ToolName[] = [
  'Read',
  'Glob',
  'Grep',
  'LS',
  'WebFetch',
  'TodoRead',
  'NotebookRead',
  'Task',
  'Batch',
];

/**
 * Tools that can modify the file system
 */
export const writeTools: ToolName[] = [
  'Write',
  'Edit',
  'MultiEdit',
  'Bash',
  'TodoWrite',
  'NotebookEdit',
];

/**
 * Get a safe set of tools for read-only operations
 */
export function getReadOnlyTools(): string[] {
  return [...readOnlyTools];
}

/**
 * Get all available tools
 */
export function getAllTools(): string[] {
  return [...availableTools];
}

/**
 * Get all tools except Bash (safer default for repository configuration)
 */
export function getSafeTools(): string[] {
  return availableTools.filter((tool) => tool !== 'Bash');
}
