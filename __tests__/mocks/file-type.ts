import { vi } from 'vitest';

// Mock for file-type module
export const fileTypeFromBuffer = vi.fn().mockResolvedValue(null);