import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EventEmitter } from 'events'

// Mock @anthropic-ai/claude-code SDK
vi.mock('@anthropic-ai/claude-code', () => ({
  query: vi.fn()
}))

import { ClaudeRunner } from '../src/ClaudeRunner'
import type { ClaudeRunnerConfig } from '../src/types'
import type { ClaudeMessage } from '../src/types'
import { query } from '@anthropic-ai/claude-code'

// Cast the mocked query function
const mockQuery = vi.mocked(query)

describe('ClaudeRunner', () => {
  let runner: ClaudeRunner
  
  const defaultConfig: ClaudeRunnerConfig = {
    workingDirectory: '/tmp/test'
  }

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()
    
    // Default mock implementation that returns an empty async generator
    mockQuery.mockImplementation(async function* () {
      // Empty generator by default
    })
  })

  afterEach(() => {
    if (runner) {
      runner.kill()
    }
  })

  describe('Constructor & Initialization', () => {
    it('should create ClaudeRunner instance', () => {
      runner = new ClaudeRunner(defaultConfig)
      expect(runner).toBeInstanceOf(ClaudeRunner)
      expect(runner).toBeInstanceOf(EventEmitter)
    })

    it('should register onMessage callback if provided', () => {
      const onMessage = vi.fn()
      runner = new ClaudeRunner({
        ...defaultConfig,
        onMessage
      })
      
      runner.emit('message', { type: 'test' } as any)
      expect(onMessage).toHaveBeenCalledWith({ type: 'test' })
    })

    it('should register onSessionStart callback if provided', () => {
      const onSessionStart = vi.fn()
      runner = new ClaudeRunner({
        ...defaultConfig,
        onSessionStart
      })
      
      runner.emit('session:start')
      expect(onSessionStart).toHaveBeenCalled()
    })

    it('should register onSessionEnd callback if provided', () => {
      const onSessionEnd = vi.fn()
      runner = new ClaudeRunner({
        ...defaultConfig,
        onSessionEnd
      })
      
      runner.emit('session:end', 0)
      expect(onSessionEnd).toHaveBeenCalledWith(0)
    })

    it('should register onSessionError callback if provided', () => {
      const onSessionError = vi.fn()
      runner = new ClaudeRunner({
        ...defaultConfig,
        onSessionError
      })
      
      const error = new Error('test error')
      runner.emit('session:error', error)
      expect(onSessionError).toHaveBeenCalledWith(error)
    })
  })

  describe('spawn()', () => {
    it('should start Claude SDK session', () => {
      runner = new ClaudeRunner(defaultConfig)
      
      const result = runner.spawn()
      
      expect(result).toEqual({
        process: null,
        pid: undefined,
        startedAt: expect.any(Date)
      })
      expect(runner.isRunning()).toBe(true)
    })

    it('should emit session:start event', () => {
      runner = new ClaudeRunner(defaultConfig)
      const startSpy = vi.fn()
      runner.on('session:start', startSpy)
      
      runner.spawn()
      
      expect(startSpy).toHaveBeenCalled()
    })

    it('should throw error if session already running', () => {
      runner = new ClaudeRunner(defaultConfig)
      runner.spawn()
      
      expect(() => runner.spawn()).toThrowError('Claude session already running')
    })
  })

  describe('sendInput()', () => {
    it('should throw error if no active session', async () => {
      runner = new ClaudeRunner(defaultConfig)
      
      await expect(runner.sendInput('test')).rejects.toThrowError('No active Claude session')
    })

    it('should call SDK query with input', async () => {
      runner = new ClaudeRunner(defaultConfig)
      runner.spawn()
      
      // Mock the SDK to complete immediately
      mockQuery.mockImplementation(async function* () {
        yield { type: 'result', result: 'test response' } as ClaudeMessage
      })
      
      await runner.sendInput('test input')
      
      expect(mockQuery).toHaveBeenCalledWith({
        prompt: 'test input',
        abortController: expect.any(AbortController),
        options: expect.objectContaining({
          cwd: '/tmp/test'
        })
      })
    })
  })

  describe('sendInitialPrompt()', () => {
    it('should call SDK query with prompt', async () => {
      runner = new ClaudeRunner(defaultConfig)
      runner.spawn()
      
      // Mock the SDK to complete immediately
      mockQuery.mockImplementation(async function* () {
        yield { type: 'result', result: 'test response' } as ClaudeMessage
      })
      
      await runner.sendInitialPrompt('test prompt')
      
      expect(mockQuery).toHaveBeenCalledWith({
        prompt: 'test prompt',
        abortController: expect.any(AbortController),
        options: expect.objectContaining({
          cwd: '/tmp/test'
        })
      })
    })

    it('should throw error if no active session', async () => {
      runner = new ClaudeRunner(defaultConfig)
      
      await expect(runner.sendInitialPrompt('test')).rejects.toThrowError('No abort controller available')
    })
  })

  describe('kill()', () => {
    it('should abort session and set running to false', () => {
      runner = new ClaudeRunner(defaultConfig)
      runner.spawn()
      
      expect(runner.isRunning()).toBe(true)
      runner.kill()
      expect(runner.isRunning()).toBe(false)
    })
  })

  describe('isRunning()', () => {
    it('should return false initially', () => {
      runner = new ClaudeRunner(defaultConfig)
      expect(runner.isRunning()).toBe(false)
    })

    it('should return true after spawn', () => {
      runner = new ClaudeRunner(defaultConfig)
      runner.spawn()
      expect(runner.isRunning()).toBe(true)
    })

    it('should return false after kill', () => {
      runner = new ClaudeRunner(defaultConfig)
      runner.spawn()
      runner.kill()
      expect(runner.isRunning()).toBe(false)
    })
  })

  describe('SDK Message Handling', () => {
    it('should emit message events from SDK', async () => {
      runner = new ClaudeRunner(defaultConfig)
      runner.spawn()
      
      const messageSpy = vi.fn()
      runner.on('message', messageSpy)
      
      const testMessage: ClaudeMessage = {
        type: 'assistant',
        message: {
          id: 'test',
          type: 'message',
          role: 'assistant',
          model: 'claude-3-sonnet',
          content: [{ type: 'text', text: 'Hello' }]
        },
        session_id: 'test-session'
      }
      
      // Mock SDK to yield our test message
      mockQuery.mockImplementation(async function* () {
        yield testMessage
      })
      
      await runner.sendInput('test')
      
      expect(messageSpy).toHaveBeenCalledWith(testMessage)
    })

    it('should emit session:end when SDK completes', async () => {
      runner = new ClaudeRunner(defaultConfig)
      runner.spawn()
      
      const endSpy = vi.fn()
      runner.on('session:end', endSpy)
      
      // Mock SDK to complete immediately
      mockQuery.mockImplementation(async function* () {
        yield { type: 'result', result: 'completed' } as ClaudeMessage
      })
      
      await runner.sendInput('test')
      
      expect(endSpy).toHaveBeenCalledWith(0)
    })

    it('should emit session:error when SDK throws', async () => {
      runner = new ClaudeRunner(defaultConfig)
      runner.spawn()
      
      const errorSpy = vi.fn()
      runner.on('session:error', errorSpy)
      
      const testError = new Error('SDK error')
      mockQuery.mockImplementation(async function* () {
        throw testError
      })
      
      await runner.sendInput('test')
      
      expect(errorSpy).toHaveBeenCalledWith(testError)
    })
  })

  describe('Configuration', () => {
    it('should pass SDK options to query', async () => {
      const config: ClaudeRunnerConfig = {
        workingDirectory: '/custom/dir',
        allowedTools: ['Read', 'Write'],
        maxTurns: 5,
        continueSession: true,
        sdkOptions: {
          model: 'claude-3-opus'
        }
      }
      
      runner = new ClaudeRunner(config)
      runner.spawn()
      
      mockQuery.mockImplementation(async function* () {
        yield { type: 'result', result: 'test' } as ClaudeMessage
      })
      
      await runner.sendInput('test')
      
      expect(mockQuery).toHaveBeenCalledWith({
        prompt: 'test',
        abortController: expect.any(AbortController),
        options: expect.objectContaining({
          cwd: '/custom/dir',
          allowedTools: ['Read', 'Write'],
          maxTurns: 5,
          continue: true,
          model: 'claude-3-opus'
        })
      })
    })
  })
})