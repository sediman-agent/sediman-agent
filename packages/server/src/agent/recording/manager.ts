/**
 * Recording Manager - Stub Implementation
 *
 * This is a stub implementation to maintain compatibility
 * while the full recording functionality is being restored.
 */

export interface RecordingSession {
  id: string;
  name: string;
  startedAt: string;
  status: 'active' | 'stopped';
}

export class RecordingManager {
  private sessions: Map<string, RecordingSession> = new Map();

  startRecording(name: string): { sessionId: string; status: string } {
    const sessionId = `rec_${Date.now()}`;
    const session: RecordingSession = {
      id: sessionId,
      name,
      startedAt: new Date().toISOString(),
      status: 'active',
    };
    this.sessions.set(sessionId, session);

    return {
      sessionId,
      status: 'started',
    };
  }

  stopRecording(sessionId: string): { sessionId: string; status: string } {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = 'stopped';
      this.sessions.set(sessionId, session);
    }

    return {
      sessionId,
      status: 'stopped',
    };
  }

  getActiveSessions(): RecordingSession[] {
    return Array.from(this.sessions.values()).filter(s => s.status === 'active');
  }

  getSession(sessionId: string): RecordingSession | undefined {
    return this.sessions.get(sessionId);
  }
}
