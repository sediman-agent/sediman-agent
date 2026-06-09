/**
 * Structured Output Schema Tests
 */

import { describe, it, expect } from 'bun:test';
import { z } from 'zod';
import {
  AgentThoughtSchema,
  AgentResponseSchema,
  ToolCallSchema,
  TaskDecompositionSchema,
  MemoryEntrySchema,
  validateAgentResponse,
  coerceAgentResponse,
  createAgentResponse,
  createMinimalResponse,
  createSuccessResponse,
  createFailureResponse,
  schemas
} from '../../../src/agent/schemas/agent-schemas';

describe('Agent Schemas', () => {
  describe('AgentThoughtSchema', () => {
    const validThought = {
      thinking: 'I need to navigate to the search page',
      evaluation: 'success',
      memory: 'Navigated to search page, ready to search',
      nextGoal: 'Search for the requested item'
    };

    it('should validate a complete thought', () => {
      const result = AgentThoughtSchema.safeParse(validThought);
      expect(result.success).toBe(true);
    });

    it('should require thinking field', () => {
      const invalid = { ...validThought, thinking: '' };
      const result = AgentThoughtSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should require evaluation field', () => {
      const invalid = { ...validThought, evaluation: '' };
      const result = AgentThoughtSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should require evaluation to indicate success/failure/uncertain', () => {
      const invalid = { ...validThought, evaluation: 'maybe' };
      const result = AgentThoughtSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should require memory field', () => {
      const invalid = { ...validThought, memory: '' };
      const result = AgentThoughtSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should require nextGoal field', () => {
      const invalid = { ...validThought, nextGoal: '' };
      const result = AgentThoughtSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should limit nextGoal length', () => {
      const invalid = { ...validThought, nextGoal: 'a'.repeat(201) };
      const result = AgentThoughtSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('ToolCallSchema', () => {
    const validToolCall = {
      name: 'browser_click',
      arguments: { refId: 5 }
    };

    it('should validate a complete tool call', () => {
      const result = ToolCallSchema.safeParse(validToolCall);
      expect(result.success).toBe(true);
    });

    it('should require name field', () => {
      const invalid = { ...validToolCall, name: '' };
      const result = ToolCallSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should require snake_case name', () => {
      const invalid = { ...validToolCall, name: 'browserClick' };
      const result = ToolCallSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should accept optional reasoning', () => {
      const withReasoning = {
        ...validToolCall,
        reasoning: 'Need to click submit button'
      };
      const result = ToolCallSchema.safeParse(withReasoning);
      expect(result.success).toBe(true);
      expect(result.data?.reasoning).toBe('Need to click submit button');
    });
  });

  describe('AgentResponseSchema', () => {
    const validResponse = {
      thought: {
        thinking: 'Analyzing page state',
        evaluation: 'success',
        memory: 'Page loaded successfully',
        nextGoal: 'Find search box'
      },
      actions: [
        {
          name: 'browser_snapshot',
          arguments: {}
        }
      ],
      done: false,
      confidence: 0.8,
      estimatedRemainingSteps: 5
    };

    it('should validate a complete response', () => {
      const result = AgentResponseSchema.safeParse(validResponse);
      expect(result.success).toBe(true);
    });

    it('should require thought field', () => {
      const invalid = { ...validResponse, thought: undefined };
      const result = AgentResponseSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should limit actions to 10', () => {
      const invalid = {
        ...validResponse,
        actions: Array(11).fill({ name: 'test', arguments: {} })
      };
      const result = AgentResponseSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should allow optional summary', () => {
      const withSummary = {
        ...validResponse,
        done: true,
        summary: 'Task completed successfully'
      };
      const result = AgentResponseSchema.safeParse(withSummary);
      expect(result.success).toBe(true);
    });

    it('should validate confidence range', () => {
      const invalid = { ...validResponse, confidence: 1.5 };
      const result = AgentResponseSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should validate estimatedRemainingSteps range', () => {
      const invalid = { ...validResponse, estimatedRemainingSteps: -1 };
      const result = AgentResponseSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should allow actions to be optional', () => {
      const withoutActions = {
        ...validResponse,
        actions: undefined
      };
      const result = AgentResponseSchema.safeParse(withoutActions);
      expect(result.success).toBe(true);
    });
  });

  describe('TaskDecompositionSchema', () => {
    const validDecomposition = {
      subtasks: [
        {
          description: 'Navigate to search page',
          dependencies: [],
          canParallelize: false,
          difficulty: 2
        }
      ],
      estimatedIterations: 5,
      reasoning: 'Single task, no decomposition needed'
    };

    it('should validate a complete decomposition', () => {
      const result = TaskDecompositionSchema.safeParse(validDecomposition);
      expect(result.success).toBe(true);
    });

    it('should require at least one subtask', () => {
      const invalid = { ...validDecomposition, subtasks: [] };
      const result = TaskDecompositionSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should limit subtasks to 20', () => {
      const invalid = {
        ...validDecomposition,
        subtasks: Array(21).fill({
          description: 'test',
          dependencies: [],
          canParallelize: false,
          difficulty: 3
        })
      };
      const result = TaskDecompositionSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should validate difficulty range', () => {
      const invalid = {
        ...validDecomposition,
        subtasks: [{
          description: 'test',
          dependencies: [],
          canParallelize: false,
          difficulty: 10
        }]
      };
      const result = TaskDecompositionSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('MemoryEntrySchema', () => {
    const validEntry = {
      content: 'Test memory content',
      type: 'step',
      metadata: {
        task: 'test task',
        success: true
      },
      importance: 0.7
    };

    it('should validate a complete memory entry', () => {
      const result = MemoryEntrySchema.safeParse(validEntry);
      expect(result.success).toBe(true);
    });

    it('should require content field', () => {
      const invalid = { ...validEntry, content: '' };
      const result = MemoryEntrySchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should validate type enum', () => {
      const invalid = { ...validEntry, type: 'invalid' as any };
      const result = MemoryEntrySchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should validate importance range', () => {
      const invalid = { ...validEntry, importance: 1.5 };
      const result = MemoryEntrySchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('schemas export', () => {
    it('should export all schemas', () => {
      expect(schemas.AgentThought).toBeDefined();
      expect(schemas.ToolCall).toBeDefined();
      expect(schemas.AgentResponse).toBeDefined();
      expect(schemas.TaskDecomposition).toBeDefined();
      expect(schemas.MemoryEntry).toBeDefined();
    });
  });
});

describe('Validation Functions', () => {
  describe('validateAgentResponse', () => {
    it('should validate valid response', () => {
      const valid = {
        thought: {
          thinking: 'test',
          evaluation: 'success',
          memory: 'test',
          nextGoal: 'test'
        },
        done: false
      };

      const result = validateAgentResponse(valid);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should return errors for invalid response', () => {
      const invalid = { invalid: 'data' };

      const result = validateAgentResponse(invalid);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
    });
  });

  describe('coerceAgentResponse', () => {
    it('should return valid response as-is', () => {
      const valid = {
        thought: {
          thinking: 'test',
          evaluation: 'success',
          memory: 'test',
          nextGoal: 'test'
        },
        done: false
      };

      const result = coerceAgentResponse(valid);
      expect(result.thought).toBeDefined();
    });

    it('should add missing thought field', () => {
      const partial = {
        thinking: 'test',
        evaluation: 'success',
        memory: 'test',
        nextGoal: 'test',
        done: false
      } as any;

      const result = coerceAgentResponse(partial);
      expect(result.thought).toBeDefined();
    });

    it('should coerce done to boolean', () => {
      const partial = {
        thought: {
          thinking: 'test',
          evaluation: 'success',
          memory: 'test',
          nextGoal: 'test'
        },
        done: 'true' as any,
        actions: []
      };

      const result = coerceAgentResponse(partial);
      expect(result.done).toBe(true);
    });

    it('should coerce actions to array', () => {
      const partial = {
        thought: {
          thinking: 'test',
          evaluation: 'success',
          memory: 'test',
          nextGoal: 'test'
        },
        done: false,
        actions: { name: 'test', arguments: {} } as any
      };

      const result = coerceAgentResponse(partial);
      expect(Array.isArray(result.actions)).toBe(true);
    });
  });
});

describe('Response Creators', () => {
  describe('createAgentResponse', () => {
    it('should create valid response from partial data', () => {
      const response = createAgentResponse({
        thought: {
          thinking: 'test',
          evaluation: 'uncertain',
          memory: 'test',
          nextGoal: 'test'
        }
      });

      expect(response).toBeDefined();
      expect(response.thought.thinking).toBe('test');
    });

    it('should use defaults for missing fields', () => {
      const response = createAgentResponse({});

      expect(response.thought).toBeDefined();
      expect(response.done).toBe(false);
      expect(response.confidence).toBeDefined();
    });
  });

  describe('createMinimalResponse', () => {
    it('should create minimal valid response', () => {
      const response = createMinimalResponse('test thinking', 'test memory', 'test goal');

      expect(response.thought.thinking).toBe('test thinking');
      expect(response.thought.memory).toBe('test memory');
      expect(response.thought.nextGoal).toBe('test goal');
      expect(response.done).toBe(false);
    });

    it('should set done to true when specified', () => {
      const response = createMinimalResponse('test', 'test', 'test', true);

      expect(response.done).toBe(true);
    });
  });

  describe('createSuccessResponse', () => {
    it('should create success response', () => {
      const response = createSuccessResponse('Task completed', 'Memory content');

      expect(response.done).toBe(true);
      expect(response.summary).toBe('Task completed');
      expect(response.confidence).toBe(1.0);
      expect(response.estimatedRemainingSteps).toBe(0);
    });

    it('should include memory in thought', () => {
      const response = createSuccessResponse('Task completed', 'Memory content');

      expect(response.thought.memory).toBe('Memory content');
    });
  });

  describe('createFailureResponse', () => {
    it('should create failure response', () => {
      const response = createFailureResponse('Task failed', 'Memory content');

      expect(response.done).toBe(true);
      expect(response.summary).toContain('Failed');
      expect(response.thought.evaluation).toBe('failure');
    });
  });
});
