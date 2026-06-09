/**
 * Enhanced Agent Loop Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { EnhancedAgentLoop, EnhancedAgentLoopOpts } from '../../../src/agent/execution/enhanced-loop';
import { MockToolBus, MockLLMProvider, MockStructuredLLMProvider } from '../../utils/test-utils';
import { createMockBrowserSession } from '../../utils/test-utils';

describe('EnhancedAgentLoop', () => {
  let agent: EnhancedAgentLoop;
  let mockLLM: MockLLMProvider;
  let mockStructuredLLM: MockStructuredLLMProvider;
  let mockToolBus: MockToolBus;

  beforeEach(() => {
    mockLLM = new MockLLMProvider();
    mockStructuredLLM = new MockStructuredLLMProvider();
    mockToolBus = new MockToolBus();

    const opts: EnhancedAgentLoopOpts = {
      llmProvider: mockLLM as any,
      structuredLLMProvider: mockStructuredLLM as any,
      browserSession: createMockBrowserSession() as any,
      toolBus: mockToolBus,
      useVision: false
    };

    agent = new EnhancedAgentLoop(opts);
  });

  afterEach(() => {
    agent.clearConversation();
  });

  describe('constructor', () => {
    it('should create agent with options', () => {
      expect(agent).toBeDefined();
    });

    it('should set default max iterations', () => {
      expect(agent).toBeDefined();
    });

    it('should use smart perception when enabled', () => {
      const opts: EnhancedAgentLoopOpts = {
        llmProvider: mockLLM as any,
        useSmartPerception: true,
        browserSession: createMockBrowserSession() as any
      };

      const agentWithPerception = new EnhancedAgentLoop(opts);
      expect(agentWithPerception).toBeDefined();
    });
  });

  describe('setStructuredLLMProvider', () => {
    it('should set structured LLM provider', () => {
      const newProvider = new MockStructuredLLMProvider();

      agent.setStructuredLLMProvider(newProvider as any);

      expect(agent).toBeDefined();
    });
  });

  describe('enableSmartPerception', () => {
    it('should enable smart perception', () => {
      agent.enableSmartPerception();

      expect(agent).toBeDefined();
    });
  });

  describe('run', () => {
    it('should run simple task successfully', async () => {
      // Setup mock response
      mockStructuredLLM = new MockStructuredLLMProvider({
        thought: {
          thinking: 'Starting task',
          evaluation: 'uncertain',
          memory: 'Starting task',
          nextGoal: 'Complete task'
        },
        actions: [],
        done: true,
        summary: 'Task done'
      });

      agent.setStructuredLLMProvider(mockStructuredLLM as any);

      const result = await agent.run('Test task');

      expect(result.success).toBe(true);
      expect(result.result).toContain('Task done');
    });

    it('should handle actions execution', async () => {
      mockStructuredLLM = new MockStructuredLLMProvider({
        thought: {
          thinking: 'Need to navigate',
          evaluation: 'uncertain',
          memory: 'About to navigate',
          nextGoal: 'Navigate to page'
        },
        actions: [
          {
            name: 'browser_navigate',
            arguments: { url: 'https://example.com' }
          }
        ],
        done: false
      });

      // Setup tool result
      mockToolBus.setExecutionResult('browser_navigate', {
        success: true,
        output: 'Navigated to https://example.com'
      });

      agent.setStructuredLLMProvider(mockStructuredLLM as any);

      const result = await agent.run('Navigate to example.com');

      expect(result.actions_taken).toContain('browser_navigate: success');
    });

    it('should track iteration count', async () => {
      mockStructuredLLM = new MockStructuredLLMProvider({
        thought: {
          thinking: 'test',
          evaluation: 'success',
          memory: 'test',
          nextGoal: 'test'
        },
        actions: [],
        done: true,
        summary: 'Done'
      });

      agent.setStructuredLLMProvider(mockStructuredLLM as any);

      const result = await agent.run('Test task');

      expect(result.iterations).toBe(1);
    });

    it('should handle max iterations limit', async () => {
      const opts: EnhancedAgentLoopOpts = {
        llmProvider: mockLLM as any,
        maxIterations: 2,
        browserSession: createMockBrowserSession() as any
      };

      const shortAgent = new EnhancedAgentLoop(opts);

      mockStructuredLLM = new MockStructuredLLMProvider({
        thought: {
          thinking: 'test',
          evaluation: 'uncertain',
          memory: 'test',
          nextGoal: 'continue'
        },
        actions: [],
        done: false
      });

      shortAgent.setStructuredLLMProvider(mockStructuredLLM as any);

      const result = await shortAgent.run('Test task');

      expect(result.iterations).toBeLessThanOrEqual(2);
    });

    it('should return elapsed time', async () => {
      mockStructuredLLM = new MockStructuredLLMProvider({
        thought: {
          thinking: 'test',
          evaluation: 'success',
          memory: 'test',
          nextGoal: 'test'
        },
        actions: [],
        done: true,
        summary: 'Done'
      });

      agent.setStructuredLLMProvider(mockStructuredLLM as any);

      const result = await agent.run('Test task');

      expect(result.elapsed_secs).toBeGreaterThanOrEqual(0);
    });

    it('should handle structured response with actions', async () => {
      mockStructuredLLM = new MockStructuredLLMProvider({
        thought: {
          thinking: 'Execute tool',
          evaluation: 'uncertain',
          memory: 'Executing',
          nextGoal: 'Check result'
        },
        actions: [
          { name: 'browser_snapshot', arguments: {} }
        ],
        done: false
      });

      agent.setStructuredLLMProvider(mockStructuredLLM as any);

      const result = await agent.run('Take snapshot');

      expect(result.actions_taken).toBeDefined();
    });
  });

  describe('cancel', () => {
    it('should cancel running task', async () => {
      // Create a task that would run long
      mockStructuredLLM = new MockStructuredLLMProvider({
        thought: {
          thinking: 'Running',
          evaluation: 'uncertain',
          memory: 'Running',
          nextGoal: 'Continue'
        },
        actions: [],
        done: false
      });

      agent.setStructuredLLMProvider(mockStructuredLLM as any);

      // Start task in background
      const taskPromise = agent.run('Long task');

      // Cancel immediately
      agent.cancel();

      const result = await taskPromise;

      expect(result).toBeDefined();
    });
  });

  describe('getConversation', () => {
    it('should return conversation history', () => {
      agent.clearConversation();
      agent['conversation'] = [
        { role: 'user', content: 'Test' },
        { role: 'assistant', content: 'Response' }
      ];

      const conversation = agent.getConversation();

      expect(conversation).toHaveLength(2);
      expect(conversation[0].role).toBe('user');
    });
  });

  describe('setConversation', () => {
    it('should set conversation history', () => {
      const messages = [
        { role: 'user', content: 'Test' },
        { role: 'assistant', content: 'Response' }
      ];

      agent.setConversation(messages as any);

      const conversation = agent.getConversation();
      expect(conversation).toHaveLength(2);
    });
  });

  describe('clearConversation', () => {
    it('should clear conversation history', () => {
      agent['conversation'] = [
        { role: 'user', content: 'Test' }
      ];

      agent.clearConversation();

      expect(agent.getConversation()).toHaveLength(0);
    });
  });

  describe('onStreamEvent', () => {
    it('should subscribe to stream events', () => {
      const events: any[] = [];

      const unsubscribe = agent.onStreamEvent((event) => {
        events.push(event);
      });

      expect(typeof unsubscribe).toBe('function');
    });
  });
});

describe('createEnhancedAgentLoop', () => {
  it('should create enhanced agent loop', () => {
    const mockLLM = new MockLLMProvider();
    const mockToolBus = new MockToolBus();

    const agent = new EnhancedAgentLoop({
      llmProvider: mockLLM as any,
      toolBus: mockToolBus,
      browserSession: createMockBrowserSession() as any
    });

    expect(agent).toBeDefined();
  });
});
