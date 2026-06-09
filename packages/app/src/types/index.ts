export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  status?: 'uploading' | 'done' | 'error';
}

export interface ToolCallRecord {
  id: string;
  action: string;
  detail: string;
  observation?: string;
  status: 'pending' | 'success' | 'error';
  startedAt: number;
  completedAt?: number;
}

export interface ThinkBlock {
  content: string;
  type?: string;
  label?: string;
  confidence?: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  status?: MessageStatus;
  metadata?: MessageMetadata;
  attachments?: Attachment[];
  thinking?: string | ThinkBlock[];
  toolCalls?: ToolCallRecord[];
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

export interface LogEntry {
  id: string;
  level: 'debug' | 'info' | 'warning' | 'error';
  message: string;
  timestamp: Date;
  source?: string;
}

export interface CronJob {
  id: string;
  cron: string;
  task: string;
  skill_name?: string;
  provider: string;
  model?: string;
  base_url?: string;
  created_at: string;
  last_run: string | null;
  last_result: string | null;
  enabled: boolean;
  notify?: string;
}

export type { SandboxSession, SandboxStatus, ScreenshotData, InputEvent, StreamCallback } from './sandbox';
