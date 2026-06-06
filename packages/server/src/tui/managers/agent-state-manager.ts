/**
 * AgentStateManager - Handles agent lifecycle and state for TUI
 * Extracted from tui/app.ts for better modularity
 */

import type { AgentMode } from "../app.js";

export interface AgentState {
  running: boolean;
  startTime: number;
  mode: AgentMode | "Manager";
  currentModeIndex: number;
  spinnerFrame: number;
  streamingPhase: string;
  taskCount: number;
  coderBackend: string;
  searchMode: string;
  retryAttempt: number | null;
  retryMax: number | null;
  retryCountdown: number | null;
  validationConfidence: number | null;
  validationIssues: number | null;
  reflectionStatus: boolean;
}

export class AgentStateManager {
  private state: AgentState = {
    running: false,
    startTime: 0,
    mode: "Manager",
    currentModeIndex: 0,
    spinnerFrame: 0,
    streamingPhase: "",
    taskCount: 0,
    coderBackend: "internal",
    searchMode: "auto",
    retryAttempt: null,
    retryMax: null,
    retryCountdown: null,
    validationConfidence: null,
    validationIssues: null,
    reflectionStatus: false,
  };

  /**
   * Start the agent
   */
  start(mode: AgentMode): void {
    this.state.running = true;
    this.state.startTime = Date.now();
    this.state.mode = mode;
  }

  /**
   * Stop the agent
   */
  stop(): void {
    this.state.running = false;
    this.state.streamingPhase = "";
    this.state.retryAttempt = null;
    this.state.retryMax = null;
    this.state.retryCountdown = null;
    this.state.validationConfidence = null;
    this.state.validationIssues = null;
    this.state.reflectionStatus = false;
  }

  /**
   * Check if agent is running
   */
  isRunning(): boolean {
    return this.state.running;
  }

  /**
   * Set agent mode
   */
  setMode(mode: AgentMode): void {
    this.state.mode = mode;
  }

  /**
   * Get current mode
   */
  getMode(): AgentMode | "Manager" {
    return this.state.mode;
  }

  /**
   * Set streaming phase
   */
  setStreamingPhase(phase: string): void {
    this.state.streamingPhase = phase;
  }

  /**
   * Get streaming phase
   */
  getStreamingPhase(): string {
    return this.state.streamingPhase;
  }

  /**
   * Increment spinner frame for animation
   */
  advanceSpinner(): string {
    const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
    const frame = frames[this.state.spinnerFrame % frames.length];
    this.state.spinnerFrame++;
    return frame;
  }

  /**
   * Get current spinner frame
   */
  getSpinnerFrame(): number {
    return this.state.spinnerFrame;
  }

  /**
   * Increment task count
   */
  incrementTaskCount(): void {
    this.state.taskCount++;
  }

  /**
   * Get task count
   */
  getTaskCount(): number {
    return this.state.taskCount;
  }

  /**
   * Set retry state
   */
  setRetryState(attempt: number, max: number, countdown: number): void {
    this.state.retryAttempt = attempt;
    this.state.retryMax = max;
    this.state.retryCountdown = countdown;
  }

  /**
   * Get retry state
   */
  getRetryState(): { attempt: number | null; max: number | null; countdown: number | null } {
    return {
      attempt: this.state.retryAttempt,
      max: this.state.retryMax,
      countdown: this.state.retryCountdown,
    };
  }

  /**
   * Set validation state
   */
  setValidationState(confidence: number, issues: number): void {
    this.state.validationConfidence = confidence;
    this.state.validationIssues = issues;
  }

  /**
   * Get validation state
   */
  getValidationState(): { confidence: number | null; issues: number | null } {
    return {
      confidence: this.state.validationConfidence,
      issues: this.state.validationIssues,
    };
  }

  /**
   * Get elapsed time in seconds
   */
  getElapsedSecs(): number {
    if (!this.state.running) return 0;
    return Math.round((Date.now() - this.state.startTime) / 1000);
  }

  /**
   * Get the complete agent state
   */
  getState(): AgentState {
    return { ...this.state };
  }

  /**
   * Reset agent state
   */
  reset(): void {
    this.state = {
      running: false,
      startTime: 0,
      mode: "Manager",
      currentModeIndex: 0,
      spinnerFrame: 0,
      streamingPhase: "",
      taskCount: 0,
      coderBackend: "internal",
      searchMode: "auto",
      retryAttempt: null,
      retryMax: null,
      retryCountdown: null,
      validationConfidence: null,
      validationIssues: null,
      reflectionStatus: false,
    };
  }
}
