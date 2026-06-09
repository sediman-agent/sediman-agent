/**
 * Agent Rerun
 *
 * Reruns agent tasks from history with comparison capabilities
 * Tracks improvements and provides detailed analysis
 *
 * @module agent/history/rerun
 */

import type { AgentLoop } from '../execution/loop';
import { AgentHistoryManager, type AgentHistoryEntry } from './history-manager';
import { createLogger } from '../../core/logging';

const logger = createLogger('agent-rerun');

export interface RerunOptions {
  preserveConversation?: boolean;
  compareResults?: boolean;
}

export interface RerunResult {
  success: boolean;
  result: string;
  iterations: number;
  elapsedSecs: number;
  comparison?: {
    originalSuccess: boolean;
    originalResult: string;
    originalIterations: number;
    originalElapsedSecs: number;
    improvements: string[];
  };
}

export class AgentRerun {
  private historyManager: AgentHistoryManager;

  constructor() {
    this.historyManager = new AgentHistoryManager();
  }

  /**
   * Rerun a task from history
   *
   * @param historyId - ID of the history entry to rerun
   * @param agentLoop - Agent loop instance to use for rerun
   * @param options - Rerun options
   * @returns Rerun result with comparison if requested
   */
  async rerunFromHistory(
    historyId: string,
    agentLoop: AgentLoop,
    options: RerunOptions = {}
  ): Promise<RerunResult> {
    // Load original history
    const rerunConfig = await this.historyManager.createRerunConfig(historyId);

    if (!rerunConfig) {
      throw new Error(`History entry ${historyId} not found`);
    }

    const metadata = rerunConfig.metadata as any;

    logger.info({
      historyId,
      originalSuccess: metadata.originalSuccess,
      originalIterations: metadata.originalIterations
    }, "rerun_start");

    // Run the task
    const startTime = Date.now();
    const result = await agentLoop.run(rerunConfig.task);
    const elapsedSecs = (Date.now() - startTime) / 1000;

    // Prepare basic result
    const rerunResult: RerunResult = {
      success: result.success,
      result: result.result || 'No result',
      iterations: result.iterations,
      elapsedSecs: Math.round(elapsedSecs * 100) / 100,
    };

    // Add comparison if requested
    if (options.compareResults && metadata) {
      rerunResult.comparison = this.compareResults(
        {
          success: result.success,
          result: result.result,
          iterations: result.iterations,
          elapsedSecs: elapsedSecs
        },
        {
          success: metadata.originalSuccess || false,
          result: metadata.originalResult || 'No result',
          iterations: metadata.originalIterations || 0,
          elapsedSecs: metadata.originalElapsedSecs || 0,
        }
      );
    }

    logger.info({
      historyId,
      newSuccess: rerunResult.success,
      newIterations: rerunResult.iterations,
      newElapsedSecs: rerunResult.elapsedSecs
    }, "rerun_complete");

    return rerunResult;
  }

  /**
   * Compare original and rerun results
   */
  private compareResults(
    newResult: { success: boolean; result: string; iterations: number; elapsedSecs: number },
    originalResult: { success: boolean; result: string; iterations: number; elapsedSecs: number }
  ): {
    originalSuccess: boolean;
    originalResult: string;
    originalIterations: number;
    originalElapsedSecs: number;
    improvements: string[];
  } {
    const improvements: string[] = [];

    // Success comparison
    if (!originalResult.success && newResult.success) {
      improvements.push('Task succeeded on rerun (originally failed)');
    } else if (originalResult.success && !newResult.success) {
      improvements.push('Task failed on rerun (originally succeeded)');
    }

    // Iteration comparison
    const iterationDiff = originalResult.iterations - newResult.iterations;
    if (iterationDiff !== 0) {
      if (iterationDiff > 0) {
        improvements.push(`Used ${iterationDiff} fewer iterations (${originalResult.iterations} -> ${newResult.iterations})`);
      } else if (iterationDiff < 0) {
        improvements.push(`Used ${Math.abs(iterationDiff)} more iterations (${originalResult.iterations} -> ${newResult.iterations})`);
      }
    }

    // Time comparison
    const timeDiff = originalResult.elapsedSecs - newResult.elapsedSecs;
    if (Math.abs(timeDiff) > 1) {
      if (timeDiff > 0) {
        improvements.push(`Completed ${timeDiff.toFixed(1)}s faster (${originalResult.elapsedSecs.toFixed(1)}s -> ${newResult.elapsedSecs.toFixed(1)}s)`);
      } else {
        improvements.push(`Completed ${Math.abs(timeDiff).toFixed(1)}s slower (${originalResult.elapsedSecs.toFixed(1)}s -> ${newResult.elapsedSecs.toFixed(1)}s)`);
      }
    }

    // Result quality comparison
    if (originalResult.success && newResult.success) {
      const originalLen = originalResult.result.length;
      const currentLen = newResult.result.length;
      const lengthDiff = Math.abs(originalLen - currentLen);

      if (lengthDiff > 100) {
        if (currentLen > originalLen) {
          improvements.push(`More detailed result (${originalLen} -> ${currentLen} chars)`);
        } else {
          improvements.push(`More concise result (${originalLen} -> ${currentLen} chars)`);
        }
      }
    }

    // No improvements found
    if (improvements.length === 0) {
      improvements.push('No significant changes detected');
    }

    return {
      originalSuccess: originalResult.success,
      originalResult: originalResult.result,
      originalIterations: originalResult.iterations,
      originalElapsedSecs: originalResult.elapsedSecs,
      improvements,
    };
  }

  /**
   * Batch rerun multiple history entries
   */
  async batchRerun(
    historyIds: string[],
    agentLoop: AgentLoop,
    options?: RerunOptions
  ): Promise<Map<string, RerunResult>> {
    const results = new Map<string, RerunResult>();

    for (const historyId of historyIds) {
      try {
        const result = await this.rerunFromHistory(historyId, agentLoop, options);
        results.set(historyId, result);
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        logger.error({ historyId, error: errMsg }, "batch_rerun_failed");

        results.set(historyId, {
          success: false,
          result: `Rerun failed: ${errMsg}`,
          iterations: 0,
          elapsedSecs: 0,
        });
      }
    }

    return results;
  }

  /**
   * Get history manager instance
   */
  getHistoryManager(): AgentHistoryManager {
    return this.historyManager;
  }
}

/**
 * Create an agent rerun instance
 */
export function createAgentRerun(): AgentRerun {
  return new AgentRerun();
}
