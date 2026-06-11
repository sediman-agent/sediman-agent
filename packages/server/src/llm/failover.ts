/**
 * LLM Provider Failover Module
 * Handles automatic failover between LLM providers
 */

import type { LLMProvider } from './provider';
import { createLogger } from '../core/logging';

const logger = createLogger('llm-failover');

export interface FailoverOptions {
  fallbackProvider?: LLMProvider;
  maxConsecutiveFailures?: number;
  clearHistoryOnSuccess?: boolean;
  resetOnFallbackSuccess?: boolean;
}

export interface FailoverResult {
  usedProvider: 'primary' | 'fallback';
  response?: any;
  error?: Error;
}

export class FailoverTracker {
  private consecutiveFailures = 0;
  private failureHistory: Error[] = [];
  private maxFailures = 3;

  /**
   * Check if failover should be triggered
   */
  shouldTriggerFailover(error: Error): boolean {
    this.consecutiveFailures++;
    this.failureHistory.push(error);

    logger.warn({
      consecutiveFailures: this.consecutiveFailures,
      maxFailures: this.maxFailures,
      error: error.message
    }, 'llm_failure_recorded');

    return this.consecutiveFailures >= this.maxFailures;
  }

  /**
   * Reset failure tracking
   */
  reset(): void {
    this.consecutiveFailures = 0;
    this.failureHistory = [];
  }

  /**
   * Get current failure count
   */
  getFailureCount(): number {
    return this.consecutiveFailures;
  }

  /**
   * Check if has recent failures
   */
  hasRecentFailures(): boolean {
    return this.consecutiveFailures > 0;
  }

  /**
   * Get last error
   */
  getLastError(): Error | null {
    if (this.failureHistory.length === 0) {
      return null;
    }
    return this.failureHistory[this.failureHistory.length - 1];
  }

  /**
   * Set max failures before failover
   */
  setMaxFailures(max: number): void {
    this.maxFailures = max;
  }
}

/**
 * Execute with automatic failover
 */
export async function executeWithFailover<T>(
  primaryFn: () => Promise<T>,
  tracker: FailoverTracker,
  fallbackFn?: () => Promise<T>,
  options: FailoverOptions = {}
): Promise<FailoverResult> {
  const {
    fallbackProvider,
    maxConsecutiveFailures = 3,
    clearHistoryOnSuccess = true,
    resetOnFallbackSuccess = true
  } = options;

  tracker.setMaxFailures(maxConsecutiveFailures);

  try {
    // Try primary provider
    const result = await primaryFn();

    // Clear failure history on success
    if (tracker.hasRecentFailures() && clearHistoryOnSuccess !== false) {
      tracker.reset();
    }

    return {
      usedProvider: 'primary',
      response: result
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));

    // Check if we should trigger failover
    if (tracker.shouldTriggerFailover(err)) {
      if (!fallbackFn) {
        return {
          usedProvider: 'primary',
          error: new Error('Primary provider failed but no fallback available')
        };
      }

      logger.warn({
        primaryFailures: tracker.getFailureCount(),
        lastError: err.message
      }, 'triggering_failover');

      try {
        // Try fallback provider
        const fallbackResult = await fallbackFn();

        logger.info('fallback_succeeded');

        // Optionally reset failure tracking on fallback success
        if (resetOnFallbackSuccess) {
          tracker.reset();
        }

        return {
          usedProvider: 'fallback',
          response: fallbackResult
        };
      } catch (fallbackError) {
        const fbErr = fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError));
        const combinedError = new Error(
          `Both primary and fallback providers failed. Primary: ${err.message}, Fallback: ${fbErr.message}`
        );

        return {
          usedProvider: 'fallback',
          error: combinedError
        };
      }
    }

    // Not enough failures yet, re-throw
    return {
      usedProvider: 'primary',
      error: err
    };
  }
}

/**
 * Analyze error pattern to determine if failover is recommended
 */
export function analyzeErrorPattern(errors: Error[]): {
  shouldFailover: boolean;
  reason: string;
  confidence: number;
} {
  if (errors.length === 0) {
    return {
      shouldFailover: false,
      reason: 'No errors to analyze',
      confidence: 0
    };
  }

  // Check for rate limiting
  const rateLimitCount = errors.filter(e =>
    e.message.includes('rate limit') ||
    e.message.includes('429') ||
    e.message.includes('quota')
  ).length;

  if (rateLimitCount >= 2) {
    return {
      shouldFailover: true,
      reason: 'Multiple rate limit errors detected',
      confidence: 0.9
    };
  }

  // Check for timeout errors
  const timeoutCount = errors.filter(e =>
    e.message.includes('timeout') ||
    e.message.includes('timed out')
  ).length;

  if (timeoutCount >= 3) {
    return {
      shouldFailover: true,
      reason: 'Multiple timeout errors detected',
      confidence: 0.8
    };
  }

  // Check for authentication errors
  const authCount = errors.filter(e =>
    e.message.includes('auth') ||
    e.message.includes('401') ||
    e.message.includes('403')
  ).length;

  if (authCount > 0) {
    return {
      shouldFailover: true,
      reason: 'Authentication error detected',
      confidence: 1.0
    };
  }

  return {
    shouldFailover: false,
    reason: 'No critical error pattern detected',
    confidence: 0
  };
}
