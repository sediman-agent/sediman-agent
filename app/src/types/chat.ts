// Chat-specific types

// Import types first to avoid circular dependency
import type { Message } from './index';
import type { TokenUsage } from './api';

export interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  isStreaming: boolean;
}

export interface MessageMetadata {
  model?: string;
  tokens?: number;
  duration?: number;
}

export interface MessageChunk {
  delta: string;
  finished: boolean;
  error?: string;
  usage?: TokenUsage;
}

export interface StreamingState {
  isStreaming: boolean;
  currentMessage: string;
  buffer: string;
}

// Define Conversation locally to break circular dependency
export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}
