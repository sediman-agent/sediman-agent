/**
 * Execution Strategy Module
 * Provides pluggable execution behaviors for action tools
 */

import type { ExecutableToolResult, ToolExecution } from './types';
import type { ReadonlyActionContext } from './action-tool';
import { createLogger } from '../../core/logging';

const logger = createLogger('execution-strategy');

/**
 * Strategy interface for custom execution behaviors
 */
export interface ExecutionStrategy {
  shouldExecute(actionName: string): boolean;
  onBeforeExecute?(actionName: string): void | Promise<void>;
  onAfterExecute?(actionName: string, result: ExecutableToolResult): void | Promise<void>;
}

/**
 * Default execution strategy
 */
export class DefaultStrategy implements ExecutionStrategy {
  shouldExecute(actionName: string): boolean {
    return true; // Execute all actions by default
  }

  onBeforeExecute?(actionName: string): void {
    logger.debug(`[DefaultStrategy] Before: ${actionName}`);
  }

  onAfterExecute?(actionName: string, result: ExecutableToolResult): void {
    logger.debug(`[DefaultStrategy] After: ${actionName} - ${result.isError ? 'failed' : 'success'}`);
  }
}

/**
 * Read-only execution strategy (no actual execution)
 */
export class ReadOnlyStrategy implements ExecutionStrategy {
  shouldExecute(actionName: string): boolean {
    return false; // Never execute in read-only mode
  }

  onBeforeExecute?(actionName: string): void {
    logger.debug(`[ReadOnlyStrategy] Blocked: ${actionName}`);
  }
}

/**
 * Retry strategy with automatic retries
 */
export class RetryStrategy implements ExecutionStrategy {
  private maxRetries: number;
  private retryCount: number = 0;

  constructor(maxRetries: number = 3) {
    this.maxRetries = maxRetries;
  }

  shouldExecute(actionName: string): boolean {
    return true;
  }

  onBeforeExecute?(actionName: string): void {
    this.retryCount = 0;
    logger.debug(`[RetryStrategy] Attempt ${this.retryCount + 1}: ${actionName}`);
  }

  async onAfterExecute?(actionName: string, result: ExecutableToolResult): Promise<void> {
    if (result.isError && this.retryCount < this.maxRetries) {
      this.retryCount++;
      logger.info(`[RetryStrategy] Retrying ${actionName} (${this.retryCount}/${this.maxRetries})`);
      // Re-execution will be handled by caller
    } else if (!result.isError) {
      this.retryCount = 0;
    } else {
      logger.error(`[RetryStrategy] Max retries reached for ${actionName}`);
    }
  }

  reset(): void {
    this.retryCount = 0;
  }
}

/**
 * Timeout strategy with automatic timeouts
 */
export class TimeoutStrategy implements ExecutionStrategy {
  private timeouts: Map<string, number> = new Map();
  private defaultTimeout: number;

  constructor(defaultTimeout: number = 30000) {
    this.defaultTimeout = defaultTimeout;
  }

  shouldExecute(actionName: string): boolean {
    return true;
  }

  /**
   * Set timeout for specific action
   */
  setActionTimeout(actionName: string, timeout: number): void {
    this.timeouts.set(actionName, timeout);
  }

  /**
   * Get timeout for action
   */
  getActionTimeout(actionName: string): number {
    return this.timeouts.get(actionName) ?? this.defaultTimeout;
  }

  onBeforeExecute?(actionName: string): void {
    const timeout = this.getActionTimeout(actionName);
    logger.debug(`[TimeoutStrategy] ${actionName} timeout: ${timeout}ms`);
  }
}

/**
 * Strategy factory
 */
export function createStrategy(type: 'default' | 'readonly' | 'retry' | 'timeout', options?: any): ExecutionStrategy {
  switch (type) {
    case 'readonly':
      return new ReadOnlyStrategy();
    case 'retry':
      return new RetryStrategy(options?.maxRetries);
    case 'timeout':
      return new TimeoutStrategy(options?.defaultTimeout);
    case 'default':
    default:
      return new DefaultStrategy();
  }
}
