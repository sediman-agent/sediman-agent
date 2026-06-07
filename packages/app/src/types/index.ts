export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  status?: 'uploading' | 'done' | 'error';
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  status?: MessageStatus;
  metadata?: MessageMetadata;
  attachments?: Attachment[];
  thinking?: string; // Thinking content extracted from <think/> tags
}

export type MessageStatus = 'idle' | 'sending' | 'streaming' | 'done' | 'error';

export interface MessageMetadata {
  model?: string;
  tokens?: number;
  duration?: number;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Task {
  id: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  version: string;
  author?: string;
  installed: boolean;
  tags: string[];
  category?: string;
  source?: string;
  scope?: string;
}

export interface AgentStatus {
  state: 'idle' | 'running' | 'error';
  currentTask?: string;
  rpcConnected: boolean;
  browserConnected: boolean;
}

export interface AppSettings {
  apiBaseUrl: string;
  autoConnect: boolean;
  theme: 'dark' | 'light';
  colorTheme?: 'default' | 'blue' | 'purple' | 'green' | 'rose' | 'cyan';
  model?: string;
  provider?: string;
  headless?: boolean;
  stealth?: boolean;
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
}

export interface LogEntry {
  id: string;
  level: 'debug' | 'info' | 'warning' | 'error';
  message: string;
  timestamp: Date;
  source?: string;
}

export type { TokenUsage } from './api';
export type { ChatState, MessageChunk, StreamingState } from './chat';
export type { SandboxSession, SandboxStatus, ScreenshotData, InputEvent, StreamCallback } from './sandbox';
