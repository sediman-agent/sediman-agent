/**
 * Response Parser Module
 * Parses and validates agent responses using structured parsing
 */

import { StructuredResponseParser, type ParsedAgentResponse } from '../schemas/parser';
import { getConfig } from '../../core/config';

export interface ParseResponseOptions {
  text: string;
  toolCalls?: any[];
  strictMode?: boolean;
}

/**
 * Parse agent response with validation
 */
export function parseAgentResponse(options: ParseResponseOptions): ParsedAgentResponse {
  const { text, toolCalls, strictMode } = options;
  const config = getConfig();

  if (!text) {
    return StructuredResponseParser.createPartial({
      thinking: '(No response from agent)',
      evaluationPreviousGoal: 'uncertain',
      memory: '',
      nextGoal: 'Continue task',
      actions: [],
      done: false,
      doneText: ''
    });
  }

  try {
    const parsed = StructuredResponseParser.parse(text, toolCalls);

    // Validate if strict mode is enabled
    const shouldValidate = strictMode ?? config.strictResponseParsing;
    if (shouldValidate) {
      const validation = StructuredResponseParser.validate(parsed);
      if (!validation.valid) {
        console.warn('[ResponseParser] Validation errors:', validation.errors);
        // Return partial response on validation failure
        return StructuredResponseParser.createPartial({
          thinking: parsed.thinking || 'Parse error - using fallback',
          evaluationPreviousGoal: parsed.evaluationPreviousGoal || 'uncertain',
          memory: parsed.memory || '',
          nextGoal: parsed.nextGoal || 'Continue task',
          actions: parsed.actions || [],
          done: parsed.done || false,
          doneText: parsed.doneText || ''
        });
      }
    }

    return parsed;
  } catch (error) {
    console.error('[ResponseParser] Parse error:', error);
    return StructuredResponseParser.createPartial({
      thinking: 'Parse error - using fallback',
      evaluationPreviousGoal: 'uncertain',
      memory: '',
      nextGoal: 'Continue task',
      actions: [],
      done: false,
      doneText: ''
    });
  }
}

/**
 * Extract thinking from parsed response
 */
export function extractThinking(parsed: ParsedAgentResponse): string {
  const parts: string[] = [];
  if (parsed.thinking) parts.push(`Thinking: ${parsed.thinking}`);
  if (parsed.evaluationPreviousGoal) parts.push(`Evaluation: ${parsed.evaluationPreviousGoal}`);
  if (parsed.memory) parts.push(`Memory: ${parsed.memory}`);
  if (parsed.nextGoal) parts.push(`Next Goal: ${parsed.nextGoal}`);
  return parts.join('\n');
}

/**
 * Extract actions from parsed response (convert args to arguments format)
 */
export function extractActions(parsed: ParsedAgentResponse): Array<{ name: string; arguments: any }> {
  return (parsed.actions || []).map(action => ({
    name: action.name,
    arguments: action.args
  }));
}

/**
 * Check if agent is done
 */
export function isAgentDone(parsed: ParsedAgentResponse): boolean {
  return parsed.done === true;
}

/**
 * Get combined text output from parsed response
 */
export function getCombinedOutput(parsed: ParsedAgentResponse): string {
  return extractThinking(parsed);
}
