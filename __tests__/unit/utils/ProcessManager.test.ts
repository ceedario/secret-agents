import { ProcessManager } from '../../../src/utils/ProcessManager.js';
import * as childProcess from 'child_process';
import { jest } from '@jest/globals';

// We'll only test the wait method which doesn't rely on the child_process module
describe('ProcessManager', () => {
  let processManager;
  
  beforeEach(() => {
    processManager = new ProcessManager();
  });
  
  test('wait returns a promise that resolves after timeout', async () => {
    // Mock setTimeout
    jest.useFakeTimers();
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
    
    const waitPromise = processManager.wait(1000);
    
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 1000);
    
    // Fast-forward time
    jest.advanceTimersByTime(1000);
    
    // Verify the promise resolves
    await expect(waitPromise).resolves.toBeUndefined();
    
    jest.useRealTimers();
  });
});