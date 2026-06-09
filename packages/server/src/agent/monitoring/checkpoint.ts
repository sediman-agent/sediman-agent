/**
 * Checkpoint manager for agent state persistence
 * Inspired by browser-use's production architecture with S3 checkpoint/restart
 */

export interface AgentCheckpoint {
  iteration: number;
  timestamp: number;
  conversation: Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>; tool_calls?: any[]; tool_call_id?: string }>;
  lastAction?: string;
  lastResult?: string;
  task: string;
  metadata?: {
    url?: string;
    title?: string;
    screenshotRef?: string;
  };
}

export interface CheckpointStorage {
  save(checkpoint: AgentCheckpoint): Promise<void>;
  load(taskId: string): Promise<AgentCheckpoint | null>;
  list(taskId: string): Promise<AgentCheckpoint[]>;
  delete(taskId: string, iteration?: number): Promise<void>;
}

/**
 * In-memory checkpoint storage (for development)
 * TODO: Replace with persistent storage (Redis, S3, filesystem)
 */
class InMemoryCheckpointStorage implements CheckpointStorage {
  private checkpoints = new Map<string, AgentCheckpoint[]>();

  async save(checkpoint: AgentCheckpoint): Promise<void> {
    const taskId = this.getTaskId(checkpoint.task);
    if (!this.checkpoints.has(taskId)) {
      this.checkpoints.set(taskId, []);
    }
    const list = this.checkpoints.get(taskId)!;

    // Find and replace existing checkpoint for same iteration, or append
    const existingIndex = list.findIndex(c => c.iteration === checkpoint.iteration);
    if (existingIndex >= 0) {
      list[existingIndex] = checkpoint;
    } else {
      list.push(checkpoint);
    }

    // Keep only last 20 checkpoints per task
    if (list.length > 20) {
      list.splice(0, list.length - 20);
    }
  }

  async load(taskId: string): Promise<AgentCheckpoint | null> {
    const list = this.checkpoints.get(taskId);
    if (!list || list.length === 0) return null;

    // Return the latest checkpoint
    return list[list.length - 1];
  }

  async list(taskId: string): Promise<AgentCheckpoint[]> {
    return this.checkpoints.get(taskId) || [];
  }

  async delete(taskId: string, iteration?: number): Promise<void> {
    if (!this.checkpoints.has(taskId)) return;

    if (iteration === undefined) {
      this.checkpoints.delete(taskId);
    } else {
      const list = this.checkpoints.get(taskId)!;
      const index = list.findIndex(c => c.iteration === iteration);
      if (index >= 0) {
        list.splice(index, 1);
      }
    }
  }

  private getTaskId(task: string): string {
    // Create a simple hash of the task for use as ID
    let hash = 0;
    for (let i = 0; i < task.length; i++) {
      const char = task.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }
}

/**
 * Checkpoint manager - handles saving and loading agent state
 */
export class CheckpointManager {
  private storage: CheckpointStorage;
  private enabled: boolean;
  private checkpointInterval: number;
  private lastCheckpointIteration: number = -1;

  constructor(config?: {
    storage?: CheckpointStorage;
    enabled?: boolean;
    checkpointInterval?: number; // Save every N iterations
  }) {
    this.storage = config?.storage || new InMemoryCheckpointStorage();
    this.enabled = config?.enabled ?? true;
    this.checkpointInterval = config?.checkpointInterval ?? 1; // Save after every step
  }

  /**
   * Check if we should save a checkpoint at this iteration
   */
  shouldCheckpoint(iteration: number): boolean {
    if (!this.enabled) return false;

    // Checkpoint if it's been at least checkpointInterval iterations since last checkpoint
    return iteration - this.lastCheckpointIteration >= this.checkpointInterval;
  }

  /**
   * Save agent state as checkpoint
   */
  async save(checkpoint: AgentCheckpoint): Promise<void> {
    if (!this.enabled) return;

    try {
      await this.storage.save(checkpoint);
      this.lastCheckpointIteration = checkpoint.iteration;
      console.log(`[Checkpoint] Saved at iteration ${checkpoint.iteration}`);
    } catch (error) {
      console.error('[Checkpoint] Failed to save:', error);
      // Don't throw - checkpoint failure shouldn't stop the agent
    }
  }

  /**
   * Load the latest checkpoint for a task
   */
  async load(task: string): Promise<AgentCheckpoint | null> {
    if (!this.enabled) return null;

    try {
      const taskId = this.getTaskId(task);
      const checkpoint = await this.storage.load(taskId);
      if (checkpoint) {
        console.log(`[Checkpoint] Loaded checkpoint from iteration ${checkpoint.iteration}`);
      }
      return checkpoint;
    } catch (error) {
      console.error('[Checkpoint] Failed to load:', error);
      return null;
    }
  }

  /**
   * List all checkpoints for a task
   */
  async listCheckpoints(task: string): Promise<AgentCheckpoint[]> {
    if (!this.enabled) return [];

    try {
      const taskId = this.getTaskId(task);
      return await this.storage.list(taskId);
    } catch (error) {
      console.error('[Checkpoint] Failed to list:', error);
      return [];
    }
  }

  /**
   * Clear all checkpoints for a task
   */
  async clear(task: string): Promise<void> {
    if (!this.enabled) return;

    try {
      const taskId = this.getTaskId(task);
      await this.storage.delete(taskId);
      console.log(`[Checkpoint] Cleared checkpoints for task`);
    } catch (error) {
      console.error('[Checkpoint] Failed to clear:', error);
    }
  }

  /**
   * Reset manager state
   */
  reset(): void {
    this.lastCheckpointIteration = -1;
  }

  /**
   * Enable/disable checkpointing
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  private getTaskId(task: string): string {
    // Create a simple hash of the task for use as ID
    let hash = 0;
    for (let i = 0; i < task.length; i++) {
      const char = task.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
}
