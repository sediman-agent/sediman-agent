/**
 * LLM Message Builder Module
 * Handles message building and tool conversion for LLM requests
 */

import type { ToolDefinition } from '../core/types';
import type { Message } from './provider';

export interface MessageBuildOptions {
  system?: string;
  includeSystem?: boolean;
}

/**
 * Build messages for LLM API
 */
export function buildMessages(
  messages: Message[],
  options: MessageBuildOptions = {}
): Message[] {
  const { system } = options;
  const out: Message[] = [];

  // Add system message if provided
  if (system) {
    out.push({ role: 'system', content: system });
  }

  // Add conversation messages
  for (const m of messages) {
    out.push(m);
  }

  return out;
}

/**
 * Convert tool definitions to OpenAI format
 */
export function toOpenAITools(tools: ToolDefinition[]): any[] {
  if (!tools || tools.length === 0) return [];

  return tools.map(tool => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }
  }));
}

/**
 * Convert tool definitions to Anthropic format
 */
export function toAnthropicTools(tools: ToolDefinition[]): any[] {
  if (!tools || tools.length === 0) return [];

  return tools.map(tool => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.parameters
  }));
}

/**
 * Validate message format
 */
export function validateMessage(message: any): boolean {
  if (!message || typeof message !== 'object') return false;

  // Check required fields
  if (!message.role || typeof message.role !== 'string') return false;

  // Check content
  if (message.content === undefined || message.content === null) return false;

  // For tool messages, check tool_call_id
  if (message.role === 'tool' && !message.tool_call_id) return false;

  // For assistant messages with tool_calls, validate structure
  if (message.role === 'assistant' && message.tool_calls) {
    if (!Array.isArray(message.tool_calls)) return false;
    for (const tc of message.tool_calls) {
      if (!tc.id || !tc.name || !tc.arguments) return false;
    }
  }

  return true;
}

/**
 * Filter and validate messages
 */
export function filterValidMessages(messages: Message[]): Message[] {
  return messages.filter(validateMessage);
}

/**
 * Add system message if not present
 */
export function ensureSystemMessage(messages: Message[], system: string): Message[] {
  const hasSystem = messages.length > 0 && messages[0].role === 'system';

  if (hasSystem) {
    return messages;
  }

  return [{ role: 'system', content: system }, ...messages];
}

/**
 * Extract tool calls from assistant message
 */
export function extractToolCalls(message: Message): any[] | undefined {
  if (message.role !== 'assistant' || !message.tool_calls) {
    return undefined;
  }

  return message.tool_calls;
}

/**
 * Create user message
 */
export function createUserMessage(content: string): Message {
  return {
    role: 'user',
    content
  };
}

/**
 * Create system message
 */
export function createSystemMessage(content: string): Message {
  return {
    role: 'system',
    content
  };
}
