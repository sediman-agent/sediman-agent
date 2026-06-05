// Common type definitions for OpenSkynet Desktop

// Message types
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  status?: MessageStatus;
  metadata?: MessageMetadata;
}

export type MessageStatus = 'idle' | 'sending' | 'streaming' | 'done' | 'error';

export interface MessageMetadata {
  model?: string;
  tokens?: number;
  duration?: number;
}

// Conversation types
export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

// Task types
export interface Task {
  id: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: string;
  createdAt: Date;
  completedAt?: Date;
}

// Skill types
export interface Skill {
  id: string;
  name: string;
  description: string;
  version: string;
  author?: string;
  installed: boolean;
  tags: string[];
}

// Agent types
export interface AgentStatus {
  state: 'idle' | 'running' | 'error';
  currentTask?: string;
  rpcConnected: boolean;
  browserConnected: boolean;
}

// Settings types
export interface AppSettings {
  rpcUrl: string;
  autoConnect: boolean;
  theme: 'dark' | 'light';
  colorTheme?: 'default' | 'blue' | 'purple' | 'green' | 'rose' | 'cyan';
  model?: string;
  provider?: 'openai' | 'ollama' | 'anthropic';
  headless?: boolean;
  stealth?: boolean;
}

// Utility types
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

// Re-export other types
export type { TokenUsage } from './api';
export type { ChatState, MessageChunk, StreamingState } from './chat';
export type { SandboxSession, SandboxStatus, ScreenshotData, InputEvent, StreamCallback } from './sandbox';
