/**
 * Agent service interface and implementation
 * Provides a typed abstraction over RPC communication
 */

import { z } from 'zod';
import type { RPCClient } from '@/services/rpcClient';
import {
  AgentError,
  RPCError,
  RPCRequestError,
  RPCResponseError,
  isAppError,
} from '@/errors';

// ============================================================================
// Schemas for type validation
// ============================================================================

export const StepEventSchema = z.object({
  step: z.number(),
  action: z.string(),
  observation: z.string(),
  phase: z.string(),
});

export type StepEvent = z.infer<typeof StepEventSchema>;

export const AgentResultSchema = z.object({
  task: z.string(),
  result: z.string(),
  success: z.boolean(),
  steps: z.array(StepEventSchema),
  skill_created: z.string().nullable(),
  actions_taken: z.array(z.any()),
  scheduled_job_id: z.string().nullable(),
  schedule_cron: z.string().nullable(),
  iterations: z.number(),
  strategy_used: z.string(),
  elapsed_secs: z.number(),
});

export type AgentResult = z.infer<typeof AgentResultSchema>;

export const StreamChunkSchema = z.object({
  type: z.enum(['chunk', 'progress', 'done', 'error']),
  streamId: z.string().optional(),
  data: z.union([
    z.object({
      delta: z.string(),
      phase: z.string().optional(),
    }),
    z.any(),
  ]),
});

export type StreamChunk = z.infer<typeof StreamChunkSchema>;

export const StreamProgressSchema = z.object({
  type: z.literal('progress'),
  data: z.object({
    phase: z.string(),
    action: z.string(),
    url: z.string().optional(),
    step: z.number(),
  }),
});

export type StreamProgress = z.infer<typeof StreamProgressSchema>;

// ============================================================================
// Service Interface
// ============================================================================

export interface StreamCallbacks {
  onChunk: (delta: string, phase?: string) => void;
  onProgress?: (progress: {
    phase: string;
    action: string;
    url?: string;
    step: number;
  }) => void;
  onDone?: () => void;
  onError?: (error: string) => void;
}

export interface AgentService {
  /**
   * Run a task and get the complete result
   */
  run(task: string, mode?: string): Promise<AgentResult>;

  /**
   * Run a task with streaming callbacks
   */
  stream(task: string, callbacks: StreamCallbacks, mode?: string): Promise<void>;

  /**
   * Cancel the currently running task
   */
  cancel(): Promise<{ cancelled: boolean }>;

  /**
   * Get agent status
   */
  getStatus(): Promise<AgentStatus>;
}

export interface AgentStatus {
  running: boolean;
  uptime_secs: number;
  browser_open: boolean;
  tasks_completed: number;
  model: string | null;
  provider: string;
  conversation_messages: number;
  current_task: string | null;
  scheduler: {
    active_jobs: number;
    total_jobs: number;
  };
  last_result: {
    task_id: string;
    task: string;
    result: string;
  } | null;
  queue_size: number;
}

// ============================================================================
// Implementation
// ============================================================================

export class RPCAgentService implements AgentService {
  constructor(private rpc: RPCClient) {}

  async run(task: string, mode = 'manager'): Promise<AgentResult> {
    try {
      const response = await this.rpc.call<any>('agent.run', { task, mode });

      // Validate response
      const validated = AgentResultSchema.safeParse(response);
      if (!validated.success) {
        throw new RPCResponseError('agent.run', response);
      }

      return validated.data;
    } catch (error) {
      if (isAppError(error)) {
        throw error;
      }
      if (error instanceof Error) {
        throw new RPCRequestError('agent.run', error.message);
      }
      throw new RPCError('Unknown error in agent.run');
    }
  }

  async stream(
    task: string,
    callbacks: StreamCallbacks,
    mode = 'manager'
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      let isDone = false;
      let hasError = false;

      try {
        // Create wrapper for onChunk that validates data
        const safeOnChunk = (delta: string, phase?: string) => {
          try {
            callbacks.onChunk(delta, phase);
          } catch (error) {
            hasError = true;
            callbacks.onError?.('Error in onChunk callback');
            reject(error);
          }
        };

        // Set up done handler
        const safeOnDone = () => {
          if (!hasError && !isDone) {
            isDone = true;
            callbacks.onDone?.();
            resolve();
          }
        };

        // Set up error handler
        const safeOnError = (error: string) => {
          if (!hasError) {
            hasError = true;
            callbacks.onError?.(error);
            reject(new AgentError(error));
          }
        };

        // Call the RPC stream method with safe wrappers
        this.rpc.stream(
          'agent.run',
          safeOnChunk,
          { task, mode },
          safeOnDone,
          safeOnError
        );

        // Also handle progress events from the RPC client
        const originalStreamHandlers = (this.rpc as any).streamHandlers;
        if (originalStreamHandlers) {
          // Store reference for cleanup
          (this as any).currentStreamHandlers = originalStreamHandlers;
        }
      } catch (error) {
        if (!hasError) {
          reject(error);
        }
      }
    });
  }

  async cancel(): Promise<{ cancelled: boolean }> {
    try {
      return await this.rpc.call<{ cancelled: boolean }>('agent.cancel', {});
    } catch (error) {
      if (isAppError(error)) {
        throw error;
      }
      throw new RPCError('Failed to cancel agent');
    }
  }

  async getStatus(): Promise<AgentStatus> {
    try {
      return await this.rpc.call<AgentStatus>('system.status', {});
    } catch (error) {
      if (isAppError(error)) {
        throw error;
      }
      throw new RPCError('Failed to get agent status');
    }
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createAgentService(rpc: RPCClient): AgentService {
  return new RPCAgentService(rpc);
}
