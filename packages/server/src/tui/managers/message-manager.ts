/**
 * MessageManager - Handles message CRUD operations for TUI
 * Extracted from tui/app.ts for better modularity
 */

import type { ChatMessage } from "../app.js";

export class MessageManager {
  private messages: ChatMessage[] = [];

  /**
   * Add a user message
   */
  addUserMessage(text: string): void {
    this.messages.push({
      type: "user",
      text,
    });
  }

  /**
   * Add a system message
   */
  addSystemMessage(text: string): void {
    this.messages.push({
      type: "system",
      text,
    });
  }

  /**
   * Add an error message
   */
  addErrorMessage(text: string): void {
    this.messages.push({
      type: "error",
      text,
    });
  }

  /**
   * Start an agent message (for streaming responses)
   */
  startAgentMessage(task: string, taskNum: number): ChatMessage {
    const message: ChatMessage = {
      type: "agent",
      task,
      taskNum,
      state: "streaming",
      thinkingExpanded: true,
      stepsExpanded: false,
    };
    this.messages.push(message);
    return message;
  }

  /**
   * Append step to current agent message
   */
  appendStep(text: string): void {
    const lastMessage = this.messages[this.messages.length - 1];
    if (lastMessage && lastMessage.type === "agent") {
      if (!lastMessage.steps) {
        lastMessage.steps = [];
      }
      lastMessage.steps.push(text);
    }
  }

  /**
   * Append streaming token to current agent message
   */
  appendStreamingToken(text: string): void {
    const lastMessage = this.messages[this.messages.length - 1];
    if (lastMessage && lastMessage.type === "agent" && lastMessage.state === "streaming") {
      // Handle thinking tags separately from visible text
      if (text.includes("<think") && text.includes("</think")) {
        const parts = text.split(/(<think[^>]*>[\s\S]*?<\/think>)/g);
        for (const part of parts) {
          if (part.startsWith("<think")) {
            // It's a thinking tag
            if (!lastMessage.thinkingText) {
              lastMessage.thinkingText = "";
            }
            lastMessage.thinkingText += part.replace(/<\/?think[^>]*>/g, "").trim();
          } else if (part.trim()) {
            // It's visible text
            if (!lastMessage.text) {
              lastMessage.text = "";
            }
            lastMessage.text += part;
          }
        }
      } else {
        // No thinking tags, just append to text
        if (!lastMessage.text) {
          lastMessage.text = "";
        }
        lastMessage.text += text;
      }

      // Limit text length to prevent memory issues
      if (lastMessage.text && lastMessage.text.length > 100_000) {
        lastMessage.text = lastMessage.text.slice(0, 100_000) + "\n\n[...truncated...]";
      }
    }
  }

  /**
   * Complete an agent message
   */
  completeAgentMessage(result: string, success: boolean, elapsedSecs: number): void {
    const lastMessage = this.messages[this.messages.length - 1];
    if (lastMessage && lastMessage.type === "agent" && lastMessage.state === "streaming") {
      lastMessage.result = result;
      lastMessage.success = success;
      lastMessage.elapsedSecs = elapsedSecs;
      lastMessage.state = "completed";
    }
  }

  /**
   * Update agent progress
   */
  updateProgress(kind: "retry" | "validation" | "reflection", data: {
    attempt?: number;
    max?: number;
    countdown?: number;
    confidence?: number;
    issues?: number;
  }): void {
    const lastMessage = this.messages[this.messages.length - 1];
    if (lastMessage && lastMessage.type === "agent") {
      if (kind === "retry") {
        lastMessage.retryAttempt = data.attempt ?? null;
        lastMessage.retryMax = data.max ?? null;
        lastMessage.retryCountdown = data.countdown ?? null;
      } else if (kind === "validation") {
        lastMessage.validationConfidence = data.confidence ?? null;
        lastMessage.validationIssues = data.issues ?? null;
      } else if (kind === "reflection") {
        lastMessage.reflectionStatus = true;
      }
    }
  }

  /**
   * Get all messages
   */
  getMessages(): ChatMessage[] {
    return this.messages;
  }

  /**
   * Clear all messages
   */
  clear(): void {
    this.messages = [];
  }

  /**
   * Get message count
   */
  getCount(): number {
    return this.messages.length;
  }

  /**
   * Strip think tags from a message
   */
  stripThinkTags(text: string): string {
    return text.replace(/<think[^>]*>[\s\S]*?<\/think>/gi, "").trim();
  }
}
