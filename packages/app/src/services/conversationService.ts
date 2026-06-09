/**
 * API client for conversation operations
 * Handles all server-side conversation persistence
 */

import { apiPost, apiGet, apiPatch, apiDelete } from './apiClient';
import type { Conversation, Message, ToolCallRecord } from '@/types';

export interface ConversationServerResponse {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages?: any[];
}

export interface ConversationsResponse {
  conversations: Array<{
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
  }>;
}

class ConversationService {
  private readonly baseUrl = '/api/conversations';

  /**
   * Get all conversations from the server
   */
  async getConversations(limit = 50): Promise<Conversation[]> {
    try {
      const response = await apiGet<ConversationsResponse>(
        `${this.baseUrl}?limit=${limit}`
      );

      return response.conversations.map(conv => ({
        id: conv.id,
        title: conv.title,
        messages: [],
        createdAt: new Date(conv.createdAt),
        updatedAt: new Date(conv.updatedAt),
      }));
    } catch (error) {
      console.error('[ConversationService] Failed to fetch conversations:', error);
      return [];
    }
  }

  /**
   * Get a single conversation with all messages
   */
  async getConversation(id: string): Promise<Conversation | null> {
    try {
      const response = await apiGet<ConversationServerResponse>(
        `${this.baseUrl}/${id}`
      );

      return {
        id: response.id,
        title: response.title,
        messages: (response.messages || []).map(this.parseMessage),
        createdAt: new Date(response.createdAt),
        updatedAt: new Date(response.updatedAt),
      };
    } catch (error) {
      console.error('[ConversationService] Failed to fetch conversation:', error);
      return null;
    }
  }

  /**
   * Create a new conversation
   */
  async createConversation(title: string = 'New Chat'): Promise<Conversation | null> {
    try {
      const response = await apiPost<ConversationServerResponse>(this.baseUrl, { title });

      return {
        id: response.id,
        title: response.title,
        messages: [],
        createdAt: new Date(response.createdAt),
        updatedAt: new Date(response.updatedAt),
      };
    } catch (error) {
      console.error('[ConversationService] Failed to create conversation:', error);
      return null;
    }
  }

  /**
   * Update conversation title
   */
  async updateConversationTitle(id: string, title: string): Promise<boolean> {
    try {
      await apiPatch(`${this.baseUrl}/${id}`, { title });
      return true;
    } catch (error) {
      console.error('[ConversationService] Failed to update conversation:', error);
      return false;
    }
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(id: string): Promise<boolean> {
    try {
      await apiDelete(`${this.baseUrl}/${id}`);
      return true;
    } catch (error) {
      console.error('[ConversationService] Failed to delete conversation:', error);
      return false;
    }
  }

  /**
   * Add a message to a conversation
   */
  async addMessage(
    conversationId: string,
    message: Omit<Message, 'id' | 'timestamp'>
  ): Promise<Message | null> {
    try {
      const response = await apiPost<{ id: string; timestamp: string }>(
        `${this.baseUrl}/${conversationId}/messages`,
        {
          role: message.role,
          content: message.content,
          status: message.status || 'done',
          thinking: typeof message.thinking === 'string'
            ? message.thinking
            : message.thinking?.[0]?.content,
        }
      );

      return {
        id: response.id,
        ...message,
        timestamp: new Date(response.timestamp),
      };
    } catch (error) {
      console.error('[ConversationService] Failed to add message:', error);
      return null;
    }
  }

  /**
   * Update a message (for streaming and status updates)
   */
  async updateMessage(
    conversationId: string,
    messageId: string,
    updates: Partial<Pick<Message, 'content' | 'status' | 'thinking'>>
  ): Promise<boolean> {
    try {
      await apiPatch(`${this.baseUrl}/${conversationId}/messages/${messageId}`, {
        content: updates.content,
        status: updates.status,
        thinking: typeof updates.thinking === 'string'
          ? updates.thinking
          : updates.thinking?.[0]?.content,
      });
      return true;
    } catch (error) {
      console.error('[ConversationService] Failed to update message:', error);
      return false;
    }
  }

  /**
   * Add a tool call to a message
   */
  async addToolCall(
    conversationId: string,
    messageId: string,
    toolCall: Omit<ToolCallRecord, 'id'>
  ): Promise<ToolCallRecord | null> {
    try {
      const response = await apiPost<{ id: string }>(
        `${this.baseUrl}/${conversationId}/messages/${messageId}/toolcalls`,
        {
          action: toolCall.action,
          detail: toolCall.detail,
          status: toolCall.status,
          startedAt: toolCall.startedAt,
          completedAt: toolCall.completedAt,
        }
      );

      return {
        ...toolCall,
        id: response.id,
      };
    } catch (error) {
      console.error('[ConversationService] Failed to add tool call:', error);
      return null;
    }
  }

  /**
   * Update a tool call
   */
  async updateToolCall(
    conversationId: string,
    toolCallId: string,
    updates: Partial<Pick<ToolCallRecord, 'observation' | 'status' | 'completedAt'>>
  ): Promise<boolean> {
    try {
      await apiPatch(`${this.baseUrl}/${conversationId}/toolcalls/${toolCallId}`, {
        observation: updates.observation,
        status: updates.status,
        completedAt: updates.completedAt,
      });
      return true;
    } catch (error) {
      console.error('[ConversationService] Failed to update tool call:', error);
      return false;
    }
  }

  /**
   * Parse server message to frontend Message format
   */
  private parseMessage(serverMessage: any): Message {
    return {
      id: serverMessage.id,
      role: serverMessage.role,
      content: serverMessage.content,
      timestamp: new Date(serverMessage.timestamp),
      status: serverMessage.status,
      thinking: serverMessage.thinking,
      toolCalls: serverMessage.toolCalls?.map((tc: any) => ({
        id: tc.id,
        action: tc.action,
        detail: tc.detail,
        observation: tc.observation,
        status: tc.status,
        startedAt: tc.startedAt,
        completedAt: tc.completedAt,
      })),
    };
  }
}

let conversationService: ConversationService | null = null;

export function getConversationService(): ConversationService {
  if (!conversationService) {
    conversationService = new ConversationService();
  }
  return conversationService;
}

export default ConversationService;
