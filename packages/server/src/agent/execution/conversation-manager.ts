/**
 * Conversation Manager Module
 * Manages agent conversation history and message construction
 */

import type { Message } from '../../llm/provider';
import logger from '../../core/logging';

export interface ConversationManagerOptions {
  initialHistory?: Array<{ role: string; content: string }>;
}

export class ConversationManager {
  private conversation: Message[] = [];

  constructor(opts: ConversationManagerOptions = {}) {
    if (opts.initialHistory) {
      this.conversation = opts.initialHistory as Message[];
    }
  }

  /**
   * Get the current conversation history
   */
  getHistory(): Message[] {
    return this.conversation;
  }

  /**
   * Get conversation (alias for getHistory)
   */
  getConversation(): Message[] {
    return this.conversation;
  }

  /**
   * Get conversation length
   */
  getLength(): number {
    return this.conversation.length;
  }

  /**
   * Get the length of the conversation
   */
  get length(): number {
    return this.conversation.length;
  }

  /**
   * Clear the conversation history
   */
  clear(): void {
    this.conversation = [];
  }

  /**
   * Set conversation from history
   */
  setConversation(history: Message[]): void {
    this.conversation = history;
  }

  /**
   * Add a user message to the conversation
   * Handles both string content and complex Message objects (for vision)
   */
  addUserMessage(content: string | Message): void {
    logger.info(`[ConversationManager] ========== STORING MESSAGE ==========`);
    logger.info(`[ConversationManager] Content type: ${typeof content}`);

    // If content is already a Message object, add it directly
    if (typeof content === 'object' && content.role) {
      this.conversation.push(content as Message);
      logger.info(`[ConversationManager] ✓ Stored vision message, total: ${this.conversation.length}`);
      logger.info(`[ConversationManager] Last message role: ${this.conversation[this.conversation.length - 1]?.role}`);
      logger.info(`[ConversationManager] Last message content type: ${typeof this.conversation[this.conversation.length - 1]?.content}`);
    } else {
      // Otherwise, wrap string content in a user message
      this.conversation.push({ role: 'user', content: content as string });
      logger.info(`[ConversationManager] ✓ Stored string message, total: ${this.conversation.length}`);
    }
  }

  /**
   * Add an assistant message to the conversation
   */
  addAssistantMessage(content: string): void {
    this.conversation.push({ role: 'assistant', content });
    logger.debug(`[ConversationManager] Added assistant message, total: ${this.conversation.length}`);
  }

  /**
   * Add a system message to the conversation
   */
  addSystemMessage(content: string): void {
    this.conversation.push({ role: 'system', content });
    logger.debug(`[ConversationManager] Added system message, total: ${this.conversation.length}`);
  }

  /**
   * Add a tool result message to the conversation
   */
  addToolResult(toolCallId: string, toolName: string, content: string | object): void {
    logger.info(`[ConversationManager] Adding tool result for ${toolName} (id: ${toolCallId})`);
    logger.debug(`[ConversationManager] Tool result content type: ${typeof content}`);

    // Check if this is MiniMax format (toolCallId format differs)
    const isMiniMaxFormat = toolCallId && toolCallId.includes('call_');

    if (isMiniMaxFormat) {
      // MiniMax format: role: 'tool', tool_call_id, content (no 'name' field)
      // For MiniMax, content should be a plain string, not JSON-encoded
      let contentStr: string;
      if (typeof content === 'string') {
        contentStr = content;
      } else if (typeof content === 'object' && content !== null) {
        // For objects, try to extract meaningful text
        if (content.text) {
          contentStr = String(content.text);
        } else if (content.result) {
          contentStr = String(content.result);
        } else if (content.output) {
          contentStr = String(content.output);
        } else {
          // Last resort: stringify the object
          contentStr = JSON.stringify(content);
        }
      } else {
        contentStr = String(content);
      }

      this.conversation.push({
        role: 'tool',
        tool_call_id: toolCallId,
        content: contentStr
      });
      logger.info(`[ConversationManager] ✓ Added MiniMax format tool result (content length: ${contentStr.length})`);
    } else {
      // OpenAI format
      this.conversation.push({
        role: 'tool',
        tool_call_id: toolCallId,
        content: typeof content === 'string' ? content : JSON.stringify(content),
        name: toolName
      });
      logger.info(`[ConversationManager] ✓ Added OpenAI format tool result`);
    }

    logger.info(`[ConversationManager] Conversation now has ${this.conversation.length} messages`);
  }

  /**
   * Add a message with tool calls to the conversation
   */
  addToolCallMessage(content: string, toolCalls: any[]): void {
    this.conversation.push({
      role: 'assistant',
      content,
      tool_calls: toolCalls
    });
    logger.debug(`[ConversationManager] Added tool call message with ${toolCalls.length} tools`);
  }

  /**
   * Get the last N messages from the conversation
   */
  getLastMessages(count: number): Message[] {
    return this.conversation.slice(-count);
  }

  /**
   * Get all messages except system messages
   */
  getNonSystemMessages(): Message[] {
    return this.conversation.filter(msg => msg.role !== 'system');
  }

  /**
   * Compress conversation by removing older messages
   */
  compress(keepRecent: number = 10): void {
    if (this.conversation.length > keepRecent) {
      const systemMessages = this.conversation.filter(msg => msg.role === 'system');
      const recentMessages = this.conversation.slice(-keepRecent);
      this.conversation = [...systemMessages, ...recentMessages];
      logger.info(`[ConversationManager] Compressed conversation from ${this.conversation.length} to ${this.conversation.length} messages`);
    }
  }

  /**
   * Export conversation to JSON
   */
  export(): string {
    return JSON.stringify(this.conversation, null, 2);
  }

  /**
   * Import conversation from JSON
   */
  import(json: string): void {
    try {
      this.conversation = JSON.parse(json);
      logger.info(`[ConversationManager] Imported ${this.conversation.length} messages`);
    } catch (error) {
      logger.error('[ConversationManager] Failed to import conversation:', error);
    }
  }
}

/**
 * Parse thinking tags from text
 */
export function parseThinking(text: string): { thinking: string | null; visible: string | null } {
  const thinkMatch = text.match(/<think(?:ing)?>([\s\S]*?)<\/think(?:ing)?>/i);
  if (thinkMatch) {
    const thinking = thinkMatch[1].trim();
    const visible = text.replace(/<think(?:ing)?>([\s\S]*?)<\/think(?:ing)?>/gi, '').trim();
    return { thinking, visible: visible || null };
  }
  return { thinking: null, visible: text || null };
}
