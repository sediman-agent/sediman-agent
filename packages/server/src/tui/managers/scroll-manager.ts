/**
 * ScrollManager - Handles scroll state management for TUI
 * Extracted from tui/app.ts for better modularity
 */

import type { ScrollState } from "../app.js";

export class ScrollManager {
  private state: ScrollState = {
    offset: 0,
    autoScroll: true,
    paused: false,
    thinkingExpanded: true,
    stepsExpanded: false,
  };

  /**
   * Toggle thinking expansion
   */
  toggleThinking(): void {
    this.state.thinkingExpanded = !this.state.thinkingExpanded;
  }

  /**
   * Toggle steps expansion
   */
  toggleSteps(): void {
    this.state.stepsExpanded = !this.state.stepsExpanded;
  }

  /**
   * Switch tab (between thinking and steps)
   */
  switchTab(tab: "thinking" | "steps"): void {
    // Tab switching logic - this would update which tab is visible
    // For now, we track expansion state
    if (tab === "thinking") {
      this.state.thinkingExpanded = true;
    } else {
      this.state.stepsExpanded = true;
    }
  }

  /**
   * Toggle tab expansion (expand/collapse both tabs)
   */
  toggleTabExpansion(): void {
    this.state.thinkingExpanded = !this.state.thinkingExpanded;
    this.state.stepsExpanded = !this.state.stepsExpanded;
  }

  /**
   * Set scroll offset
   */
  setOffset(offset: number): void {
    this.state.offset = offset;
  }

  /**
   * Get scroll offset
   */
  getOffset(): number {
    return this.state.offset;
  }

  /**
   * Enable or disable auto-scroll
   */
  setAutoScroll(enabled: boolean): void {
    this.state.autoScroll = enabled;
  }

  /**
   * Check if auto-scroll is enabled
   */
  isAutoScroll(): boolean {
    return this.state.autoScroll;
  }

  /**
   * Pause or resume scrolling
   */
  setPaused(paused: boolean): void {
    this.state.paused = paused;
  }

  /**
   * Check if scrolling is paused
   */
  isPaused(): boolean {
    return this.state.paused;
  }

  /**
   * Check if thinking is expanded
   */
  isThinkingExpanded(): boolean {
    return this.state.thinkingExpanded;
  }

  /**
   * Check if steps are expanded
   */
  areStepsExpanded(): boolean {
    return this.state.stepsExpanded;
  }

  /**
   * Get the complete scroll state
   */
  getState(): ScrollState {
    return { ...this.state };
  }

  /**
   * Reset scroll state to defaults
   */
  reset(): void {
    this.state = {
      offset: 0,
      autoScroll: true,
      paused: false,
      thinkingExpanded: true,
      stepsExpanded: false,
    };
  }
}
