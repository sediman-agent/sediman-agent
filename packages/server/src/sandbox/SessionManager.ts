/**
 * Sandbox Session Manager
 * Manages persistent sandbox sessions with ProjectManager integration
 */

import type { ProjectManager } from '../project/manager.js';

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  }).toLowerCase();
}

export interface SandboxSessionConfig {
  id: string;
  name: string;
  type: 'browser' | 'computer';
  projectId?: string;
  userId?: string;
  createdAt: number;
  lastUsedAt: number;
  status: 'starting' | 'running' | 'stopped' | 'error';
  headless?: boolean;
  proxy?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateSessionOptions {
  name?: string;
  type?: 'browser' | 'computer';
  projectId?: string;
  userId?: string;
  headless?: boolean;
  proxy?: string;
}

export class SandboxSessionManager {
  private sessions: Map<string, SandboxSessionConfig> = new Map();
  private userSessions: Map<string, string[]> = new Map();
  private projectManager: ProjectManager | null = null;

  setProjectManager(pm: ProjectManager): void {
    this.projectManager = pm;
  }

  async createSession(options: CreateSessionOptions = {}): Promise<SandboxSessionConfig> {
    const sessionId = generateUUID();
    const type = options.type || 'browser';
    const projectId = options.projectId || '__default__';

    const session: SandboxSessionConfig = {
      id: sessionId,
      name: options.name || `Sandbox ${new Date().toLocaleTimeString()}`,
      type,
      projectId,
      userId: options.userId,
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
      status: 'starting',
      headless: options.headless ?? true,
      proxy: options.proxy,
      metadata: {},
    };

    this.sessions.set(sessionId, session);

    try {
      if (this.projectManager) {
        await this.projectManager.getOrCreateBrowser(projectId);
        session.status = 'running';
        session.metadata = {
          message: 'Browser session started successfully',
          projectId,
        };
      } else {
        session.status = 'running';
        session.metadata = {
          message: 'Sandbox session created (no ProjectManager)',
          projectId,
        };
      }
    } catch (error) {
      session.status = 'error';
      session.metadata = {
        error: error instanceof Error ? error.message : 'Unknown error',
        projectId,
      };
    }

    if (options.userId) {
      const userSessionIds = this.userSessions.get(options.userId) || [];
      userSessionIds.push(sessionId);
      this.userSessions.set(options.userId, userSessionIds);
    }

    return session;
  }

  async stopSession(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    try {
      if (this.projectManager && session.projectId) {
        await this.projectManager.stopProjectBrowser(session.projectId);
      }

      session.status = 'stopped';
      session.lastUsedAt = Date.now();
      return true;
    } catch (error) {
      console.error(`Failed to stop session ${sessionId}:`, error);
      return false;
    }
  }

  getSession(sessionId: string): SandboxSessionConfig | undefined {
    return this.sessions.get(sessionId);
  }

  listSessions(): SandboxSessionConfig[] {
    return Array.from(this.sessions.values()).sort(
      (a, b) => b.lastUsedAt - a.lastUsedAt
    );
  }

  listSessionsForUser(userId: string): SandboxSessionConfig[] {
    const userSessionIds = this.userSessions.get(userId) || [];
    return userSessionIds
      .map(id => this.sessions.get(id))
      .filter(Boolean) as SandboxSessionConfig[];
  }

  listSessionsForProject(projectId: string): SandboxSessionConfig[] {
    return Array.from(this.sessions.values())
      .filter(s => s.projectId === projectId)
      .sort((a, b) => b.lastUsedAt - a.lastUsedAt);
  }

  async cleanupSession(sessionId: string): Promise<void> {
    await this.stopSession(sessionId);

    for (const [userId, sessionIds] of this.userSessions.entries()) {
      const filtered = sessionIds.filter(id => id !== sessionId);
      this.userSessions.set(userId, filtered);
    }

    this.sessions.delete(sessionId);
  }
}

// Export singleton instance for use across the application
export const sandboxSessionManager = new SandboxSessionManager();
