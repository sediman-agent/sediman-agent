/**
 * ModalManager - Handles modal lifecycle for TUI
 * Extracted from tui/app.ts for better modularity
 */

import type { ModalType, SelectItem } from "../app.js";

export interface ModalState {
  type: ModalType | null;
  data: any;
  visible: boolean;
}

export class ModalManager {
  private state: ModalState = {
    type: null,
    data: null,
    visible: false,
  };

  /**
   * Open a modal
   */
  open(type: ModalType, data: any = null): void {
    this.state = {
      type,
      data,
      visible: true,
    };
  }

  /**
   * Close the current modal
   */
  close(): void {
    this.state = {
      type: null,
      data: null,
      visible: false,
    };
  }

  /**
   * Check if a modal is open
   */
  isOpen(): boolean {
    return this.state.visible;
  }

  /**
   * Get the current modal type
   */
  getType(): ModalType | null {
    return this.state.type;
  }

  /**
   * Get the modal data
   */
  getData(): any {
    return this.state.data;
  }

  /**
   * Get the complete modal state
   */
  getState(): ModalState {
    return { ...this.state };
  }
}
