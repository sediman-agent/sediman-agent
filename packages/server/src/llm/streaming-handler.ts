/**
 * LLM Streaming Handler Module
 * Handles streaming responses from LLM providers
 */

import { createLogger } from '../core/logging';

const logger = createLogger('llm-streaming');

export interface StreamOptions {
  onToken?: (token: string) => void;
  onFirstToken?: () => void;
  onDone?: () => void;
  onError?: (error: Error) => void;
}

export interface StreamChunk {
  type: 'text' | 'tool_call' | 'tool_call_delta' | 'error' | 'done';
  content?: string;
  toolCall?: any;
  error?: string;
}

/**
 * Process streaming response from OpenAI-compatible API
 */
export async function* processOpenAIStream(
  stream: AsyncIterable<any>,
  options: StreamOptions = {}
): AsyncGenerator<string, void> {
  const { onToken, onFirstToken, onError } = options;
  let firstTokenEmitted = false;

  try {
    for await (const chunk of stream) {
      if (chunk.choices && chunk.choices[0]) {
        const choice = chunk.choices[0];

        // Handle delta content
        if (choice.delta?.content) {
          const content = choice.delta.content;
          if (content && onToken) {
            onToken(content);
          }
          if (content && !firstTokenEmitted && onFirstToken) {
            firstTokenEmitted = true;
            onFirstToken();
          }
          yield content;
        }

        // Handle tool calls
        if (choice.delta?.tool_calls) {
          // Tool calls are handled separately in chatStreamWithTools
          for (const tc of choice.delta.tool_calls) {
            if (tc.type === 'tool_call_delta') {
              yield JSON.stringify({ tool_call: tc });
            }
          }
        }

        // Check for finish reason
        if (choice.finish_reason) {
          logger.debug({ reason: choice.finish_reason }, 'stream_complete');
          break;
        }
      }
    }
  } catch (error) {
    logger.error({ error }, 'stream_error');
    if (onError) {
      onError(error instanceof Error ? error : new Error(String(error)));
    }
    throw error;
  }

  if (options.onDone) {
    options.onDone();
  }
}

/**
 * Accumulate streaming content
 */
export function accumulateStream(content: string, accumulator: string): string {
  return accumulator + content;
}

/**
 * Parse streaming chunks
 */
export function parseStreamChunk(chunk: any): StreamChunk {
  // Handle SSE-style chunks
  if (chunk.data) {
    try {
      const data = JSON.parse(chunk.data);
      if (data.choices && data.choices[0]) {
        const choice = data.choices[0];
        if (choice.delta?.content) {
          return {
            type: 'text',
            content: choice.delta.content
          };
        }
      }
    } catch {
      // Not JSON, skip
    }
  }

  // Handle direct content chunks
  if (chunk.content) {
    return {
      type: 'text',
      content: chunk.content
    };
  }

  return { type: 'done' };
}

/**
 * Detect if response is complete
 */
export function isStreamComplete(chunk: any): boolean {
  if (chunk.choices && chunk.choices[0]) {
    const choice = chunk.choices[0];
    return !!choice.finish_reason;
  }

  // Check for completion signal
  if (chunk.done || chunk.complete) {
    return true;
  }

  return false;
}

/**
 * Extract finish reason from stream chunk
 */
export function extractFinishReason(chunk: any): string | undefined {
  if (chunk.choices && chunk.choices[0]) {
    return chunk.choices[0].finish_reason;
  }

  if (chunk.finish_reason) {
    return chunk.finish_reason;
  }

  return undefined;
}

/**
 * Handle tool calls during streaming
 */
export class ToolCallAccumulator {
  private toolCalls: Map<string, any> = new Map();
  private currentToolCall: any = null;

  /**
   * Process tool call delta
   */
  processDelta(delta: any): void {
    if (delta.type === 'tool_call') {
      // New tool call
      this.currentToolCall = {
        id: delta.id,
        name: delta.name,
        arguments: delta.arguments || ''
      };
      this.toolCalls.set(delta.id, this.currentToolCall);
    } else if (delta.type === 'tool_call_delta' && this.currentToolCall) {
      // Update existing tool call
      if (delta.index !== undefined) {
        this.currentToolCall.index = delta.index;
      }
      if (delta.id !== undefined) {
        this.currentToolCall.id = delta.id;
      }
      if (delta.name !== undefined) {
        this.currentToolCall.name = delta.name;
      }
      if (delta.arguments !== undefined) {
        // Accumulate arguments (might be partial JSON)
        const currentArgs = this.currentToolCall.arguments || '';
        this.currentToolCall.arguments = currentArgs + delta.arguments;
      }
    }
  }

  /**
   * Get completed tool calls
   */
  getToolCalls(): any[] {
    const calls: any[] = [];
    for (const [id, call] of this.toolCalls) {
      // Parse arguments if they're strings
      let args = call.arguments;
      if (typeof args === 'string') {
        try {
          args = JSON.parse(args);
        } catch {
          args = {};
        }
      }

      calls.push({
        id,
        name: call.name,
        arguments: args
      });
    }
    return calls;
  }

  /**
   * Reset accumulator
   */
  reset(): void {
    this.toolCalls.clear();
    this.currentToolCall = null;
  }

  /**
   * Check if has pending tool calls
   */
  hasPendingCalls(): boolean {
    return this.toolCalls.size > 0 || this.currentToolCall !== null;
  }
}
