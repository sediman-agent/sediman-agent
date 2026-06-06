/**
 * CompletionManager - Handles command completion logic for TUI
 * Extracted from tui/app.ts for better modularity
 */

import type { SelectItem } from "../app.js";
import { COMMANDS } from "../app.js";

export interface CompletionState {
  items: string[];
  filtered: string[];
  selected: number;
  visible: boolean;
}

export class CompletionManager {
  private state: CompletionState = {
    items: [],
    filtered: [],
    selected: 0,
    visible: false,
  };

  constructor() {
    // Initialize with command names
    this.state.items = COMMANDS.map((cmd) => cmd.name);
    this.state.filtered = [...this.state.items];
  }

  /**
   * Filter completion items based on input
   */
  filter(input: string): void {
    if (!input) {
      this.state.filtered = [...this.state.items];
      this.state.selected = 0;
      return;
    }

    const lowerInput = input.toLowerCase();
    this.state.filtered = this.state.items.filter((item) =>
      item.toLowerCase().startsWith(lowerInput)
    );
    this.state.selected = 0;
  }

  /**
   * Select next completion item
   */
  selectNext(): void {
    if (this.state.filtered.length === 0) return;
    this.state.selected = (this.state.selected + 1) % this.state.filtered.length;
  }

  /**
   * Select previous completion item
   */
  selectPrevious(): void {
    if (this.state.filtered.length === 0) return;
    this.state.selected =
      this.state.selected === 0
        ? this.state.filtered.length - 1
        : this.state.selected - 1;
  }

  /**
   * Get selected completion
   */
  getSelected(): string {
    if (this.state.filtered.length === 0) return "";
    return this.state.filtered[this.state.selected];
  }

  /**
   * Show completion UI
   */
  show(): void {
    this.state.visible = true;
  }

  /**
   * Hide completion UI
   */
  hide(): void {
    this.state.visible = false;
    this.state.selected = 0;
  }

  /**
   * Check if completion is visible
   */
  isVisible(): boolean {
    return this.state.visible;
  }

  /**
   * Get all filtered items
   */
  getFilteredItems(): string[] {
    return [...this.state.filtered];
  }

  /**
   * Get selected index
   */
  getSelectedIndex(): number {
    return this.state.selected;
  }

  /**
   * Set selected index
   */
  setSelectedIndex(index: number): void {
    this.state.selected = Math.max(0, Math.min(index, this.state.filtered.length - 1));
  }

  /**
   * Add custom completion items
   */
  addItems(items: string[]): void {
    this.state.items.push(...items);
  }

  /**
   * Reset completion state
   */
  reset(): void {
    this.state.filtered = [...this.state.items];
    this.state.selected = 0;
    this.state.visible = false;
  }

  /**
   * Get the complete completion state
   */
  getState(): CompletionState {
    return { ...this.state };
  }
}
