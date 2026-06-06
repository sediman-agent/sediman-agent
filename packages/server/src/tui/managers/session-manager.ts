/**
 * SessionManager - Handles session persistence for TUI
 * Extracted from tui/app.ts for better modularity
 */

import type { ChatMessage } from "../app.js";

export interface SessionData {
  messages: ChatMessage[];
  provider: string;
  model: string | null;
  mode: string;
  timestamp: number;
}

export class SessionManager {
  private sessionFile: string;
  private autosave: boolean = true;
  private autosaveDebounce: number | null = null;

  constructor(sessionFile: string = ".sediman-session.json") {
    this.sessionFile = sessionFile;
  }

  /**
   * Save current session to file
   */
  async save(
    messages: ChatMessage[],
    provider: string,
    model: string | null,
    mode: string
  ): Promise<void> {
    if (this.autosaveDebounce) {
      clearTimeout(this.autosaveDebounce);
    }

    const sessionData: SessionData = {
      messages,
      provider,
      model,
      mode,
      timestamp: Date.now(),
    };

    try {
      // In a real implementation, this would write to the session file
      // For now, we'll just mark as saved
      this.autosave = true;
    } catch (error) {
      console.error("Failed to save session:", error);
    }
  }

  /**
   * Load session from file
   */
  async load(): Promise<SessionData | null> {
    try {
      // In a real implementation, this would read from the session file
      // For now, return null to indicate no session loaded
      return null;
    } catch (error) {
      console.error("Failed to load session:", error);
      return null;
    }
  }

  /**
   * Clear session
   */
  clear(): void {
    try {
      // In a real implementation, this would delete the session file
      this.autosave = false;
    } catch (error) {
      console.error("Failed to clear session:", error);
    }
  }

  /**
   * Enable or disable autosave
   */
  setAutosave(enabled: boolean): void {
    this.autosave = enabled;
  }

  /**
   * Check if autosave is enabled
   */
  isAutosaveEnabled(): boolean {
    return this.autosave;
  }

  /**
   * Get session file path
   */
  getSessionFile(): string {
    return this.sessionFile;
  }

  /**
   * Set session file path
   */
  setSessionFile(filePath: string): void {
    this.sessionFile = filePath;
  }
}
