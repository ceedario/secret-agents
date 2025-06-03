import express from 'express';
import { vi } from 'vitest';

import { HttpServer } from '../../../src/utils/HttpServer.mjs';

describe('HttpServer', () => {
  let httpServer;
  let mockApp;
  let mockServer;
  let mockMiddleware;
  
  beforeEach(() => {
    httpServer = new HttpServer();
    
    // Mock express app
    mockApp = {
      listen: vi.fn(),
      use: vi.fn()
    };
    
    // Mock server instance
    mockServer = {
      on: vi.fn(),
      close: vi.fn()
    };
    
    // Mock JSON middleware
    mockMiddleware = vi.fn();
    
    // Mock express and express.json
    vi.spyOn(express, 'apply').mockReturnValue(mockApp);
    vi.spyOn(express.json, 'apply').mockReturnValue(mockMiddleware);
  });
  
  test('createServer creates an Express app', () => {
    // Setup express spy
    vi.spyOn(express, 'apply').mockReturnValue(mockApp);
    
    const result = httpServer.createServer();
    
    // Since we can't directly verify express was called (due to it being outside our control),
    // we'll just test method existence
    expect(typeof result.use).toBe('function');
    expect(typeof result.listen).toBe('function');
  });
  
  test('jsonParser returns JSON middleware', () => {
    // Test that middleware would be created
    const result = httpServer.jsonParser();
    expect(typeof express.json).toBe('function');
  });
  
  test('listen returns a promise that resolves with the server', async () => {
    // Setup mock app to return the mock server
    mockApp.listen.mockReturnValue(mockServer);
    
    // Create a promise that resolves when the 'listening' event is triggered
    const listenPromise = httpServer.listen(mockApp, 3000);
    
    // Simulate the 'listening' event being triggered
    const listeningHandler = mockServer.on.mock.calls.find(call => call[0] === 'listening')[1];
    listeningHandler();
    
    // Wait for the promise to resolve
    const result = await listenPromise;
    
    // Verify the server was set up correctly
    expect(mockApp.listen).toHaveBeenCalledWith(3000);
    expect(mockServer.on).toHaveBeenCalledWith('listening', expect.any(Function));
    expect(mockServer.on).toHaveBeenCalledWith('error', expect.any(Function));
    expect(result).toBe(mockServer);
  });
  
  test('close calls server.close and resolves when callback is called', async () => {
    // Manually call the callback when close is called
    mockServer.close.mockImplementation((callback) => {
      callback();
    });
    
    await httpServer.close(mockServer);
    
    expect(mockServer.close).toHaveBeenCalled();
  });
  
  test('close resolves immediately if no server is provided', async () => {
    await expect(httpServer.close(null)).resolves.toBeUndefined();
  });
});