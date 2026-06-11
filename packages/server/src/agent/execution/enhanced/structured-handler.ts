/**
 * Enhanced Loop Structured Output Handler
 * Handles structured output processing and validation
 */

import type { AgentResponse, ToolCall } from '../../schemas';
import {
  AgentResponseSchema,
  validateAgentResponse,
  coerceAgentResponse
} from '../../schemas';
import { createLogger } from '../../../core/logging';

const logger = createLogger('enhanced-loop-structured');

export interface StructuredOutputOptions {
  useStrictValidation?: boolean;
  fallbackToParsing?: boolean;
}

/**
 * Process and validate structured output from LLM
 */
export function processStructuredOutput(
  text: string,
  toolCalls?: ToolCall[],
  options: StructuredOutputOptions = {}
): AgentResponse {
  const { useStrictValidation = true, fallbackToParsing = true } = options;

  // Try to parse as JSON first
  try {
    const parsed = JSON.parse(text);
    const validation = validateAgentResponse(parsed);

    if (validation.valid || !useStrictValidation) {
      return validation.valid ? parsed : coerceAgentResponse(parsed);
    }

    logger.warn(`[StructuredOutput] Validation errors: ${JSON.stringify(validation.errors)}`);
  } catch {
    // Not valid JSON, continue to parsing
  }

  // Try to extract structured data from text
  if (fallbackToParsing) {
    const coerced = coerceAgentResponse({ text, tool_calls: toolCalls });

    if (useStrictValidation) {
      const validation = validateAgentResponse(coerced);
      if (validation.valid) {
        return coerced;
      }
      logger.warn(`[StructuredOutput] Coerced response validation failed: ${JSON.stringify(validation.errors)}`);
    }

    return coerced;
  }

  // Create failure response
  return {
    thought: {
      thinking: 'Failed to process response',
      evaluation: 'uncertain',
      memory: '',
      nextGoal: ''
    },
    actions: [],
    done: false,
    output: text
  };
}

/**
 * Extract tool calls from agent response
 */
export function extractToolCalls(response: AgentResponse): ToolCall[] {
  if (response.actions && response.actions.length > 0) {
    return response.actions.map(action => ({
      id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: action.name,
      arguments: action.arguments
    }));
  }

  return [];
}

/**
 * Check if agent is done
 */
export function isAgentDone(response: AgentResponse): boolean {
  return response.done === true ||
         response.output?.toLowerCase().includes('task completed') ||
         response.output?.toLowerCase().includes('finished');
}

/**
 * Build agent memory from response
 */
export function buildAgentMemory(response: AgentResponse, previousMemory: string): string {
  const parts: string[] = [];

  if (response.thought?.memory) {
    parts.push(response.thought.memory);
  }

  if (response.thought?.nextGoal) {
    parts.push(`Next: ${response.thought.nextGoal}`);
  }

  const newMemory = parts.join(' | ');

  if (previousMemory) {
    // Combine with previous memory, keeping it concise
    const combined = `${previousMemory} >> ${newMemory}`;
    return combined.length > 500 ? newMemory : combined;
  }

  return newMemory;
}
