export interface ProjectFile {
  path: string;
  status: 'modified' | 'created' | 'deleted' | 'conflict';
  content?: string;
  originalContent?: string;
}

export interface Thread {
  id: string;
  title: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
  messages: ThreadMessage[];
  relatedFiles?: string[];
}

export interface ThreadMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  status?: 'streaming' | 'done' | 'error';
  phase?: 'thinking' | 'planning' | 'executing' | 'reflecting' | 'retrying';
}

export interface Project {
  id: string;
  name: string;
  path: string;
  createdAt: Date;
  updatedAt: Date;
  threads: Thread[];
  activeThreadId?: string;
  files: ProjectFile[];
  gitBranch?: string;
  gitStatus?: 'clean' | 'modified' | 'conflict' | 'diverged';
}

export interface GitCommit {
  hash: string;
  message: string;
  author: string;
  timestamp: Date;
  files?: string[];
}

export interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  staged: string[];
  modified: string[];
  untracked: string[];
  conflicted: string[];
}
