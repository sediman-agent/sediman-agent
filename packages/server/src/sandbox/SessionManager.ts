/**
 * Sandbox Session Manager
 * Manages persistent sandbox sessions with Openbrowser integration
 */

import { getOpenbrowserAdapter } from '../../agent/tools/browser-tools.js';

// Simple UUID generator
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16).toUpperCase();
  }).toLowerCase();
}

export interface SandboxSessionConfig {
  id: string;
  name: string;
  type: 'browser' | 'computer';
  userId?: string;
  createdAt: number;
  lastUsedAt: number;
  status: 'starting' | 'running' | 'stopped' | 'error';
  browserInstanceId?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateSessionOptions {
  name?: string;
  type?: 'browser' | 'computer';
  userId?: string;
  headless?: boolean;
  proxy?: string;
}

class SandboxSessionManager {
  private sessions: Map<string, SandboxSessionConfig> = new Map();
  private userSessions: Map<string, string[]> = new Map();

  async createSession(options: CreateSessionOptions = {}): Promise<SandboxSessionConfig> {
    const sessionId = generateUUID();
    const type = options.type || 'browser';

    const session: SandboxSessionConfig = {
      id: sessionId,
      name: options.name || `Sandbox ${new Date().toLocaleTimeString()}`,
      type,
      userId: options.userId,
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
      status: 'starting',
      headless: options.headless ?? true,
      proxy: options.proxy,
      metadata: {},
    };

    this.sessions.set(sessionId, session);

    // Initialize browser session
    try {
      const adapter = getOpenbrowserAdapter();
      if (!adapter) {
        session.status = 'error';
        session.metadata = { error: 'Browser adapter not initialized' };
        return session;
      }

      // Create browser instance
      const result = await adapter.executeTool('browser_new', {
        instance_id: sessionId,
        proxy: options.proxy,
      });

      if (result.success) {
        session.status = 'running';
        session.browserInstanceId = sessionId;
        session.metadata = {
          output: result.output,
          port: this.extractPort(result.output),
        };
      } else {
        session.status = 'error';
        session.metadata = { error: result.error };
      }
    } catch (error) {
      session.status = 'error';
      session.metadata = {
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Track user sessions
    if (options.userId) {
      const userSessions = this.userSessions.get(options.userId) || [];
      userSessions.push(sessionId);
      this.userSessions.set(options.userId, userSessions);
    }

    return session;
  }

  async stopSession(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    try {
      const adapter = getOpenbrowserAdapter();
      if (adapter && session.browserInstanceId) {
        await adapter.executeTool('browser_close', {
          instance_id: session.browserInstanceId,
        });
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

  async cleanupSession(sessionId: string): Promise<void> {
    await this.stopSession(sessionId);

    // Remove from user sessions
    for (const [userId, sessionIds] of this.userSessions.entries()) {
      const filtered = sessionIds.filter(id => id !== sessionId);
      this.userSessions.set(userId, filtered);
    }

    // Remove session
    this.sessions.delete(sessionId);
  }

  async cleanupOldSessions(maxAge = 24 * 60 * 60 * 1000): Promise<void> {
    const now = Date.now();
    const toRemove: string[] = [];

    for (const [id, session] of this.sessions) {
      if (now - session.lastUsedAt > maxAge) {
        toRemove.push(id);
      }
    }

    for (const id of toRemove) {
      await this.cleanupSession(id);
    }
  }

  private extractPort(output: string): number | undefined {
    const match = output?.match(/Port: (\d+)/);
    return match ? parseInt(match[1], 10) : undefined;
  }
}

// Global singleton
export const sandboxSessionManager = new SandboxSessionManager();
