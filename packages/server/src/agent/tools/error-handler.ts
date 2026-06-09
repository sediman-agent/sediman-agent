/**
 * Error classification and retry logic for agent tool execution
 * Inspired by browser-use's production architecture
 */

export enum ErrorType {
  /** Transient errors that should be retried (network, timeout) */
  TRANSIENT = 'TRANSIENT',
  /** Fatal errors that shouldn't be retried (parsing, invalid input) */
  FATAL = 'FATAL',
  /** Recoverable errors where an alternative strategy should be tried */
  RECOVERABLE = 'RECOVERABLE',
  /** Browser-specific errors that may need human intervention */
  BROWSER_BLOCKED = 'BROWSER_BLOCKED'
}

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  exponentialBackoff: boolean;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  exponentialBackoff: true,
};

/**
 * Classify an error to determine retry strategy
 */
export function classifyError(error: Error | string, toolName?: string): ErrorType {
  const errorMessage = typeof error === 'string' ? error : error.message;

  // Network/timeout errors - transient
  if (errorMessage.match(/timeout|timed out|ETIMEDOUT|ECONNRESET|fetch|network/i)) {
    return ErrorType.TRANSIENT;
  }

  // Browser-specific blocking errors
  if (errorMessage.match(/403|401|blocked|captcha|cloudflare|access.denied|bot.detected/i)) {
    return ErrorType.BROWSER_BLOCKED;
  }

  // Parsing/validation errors - fatal
  if (errorMessage.match(/parse|invalid|malformed|syntax/i)) {
    return ErrorType.FATAL;
  }

  // Element not found errors - recoverable (try alternative)
  if (errorMessage.match(/not found|element.*not|unable to locate/i)) {
    return ErrorType.RECOVERABLE;
  }

  // Browser tools get special treatment
  if (toolName?.startsWith('browser_')) {
    // Most browser errors are recoverable - page may have changed
    return ErrorType.RECOVERABLE;
  }

  // Default: assume transient for unknown errors
  return ErrorType.TRANSIENT;
}

/**
 * Calculate delay with exponential backoff
 */
export function calculateDelay(attempt: number, config: RetryConfig): number {
  if (!config.exponentialBackoff) {
    return config.baseDelayMs;
  }

  const delay = Math.min(
    config.baseDelayMs * Math.pow(2, attempt),
    config.maxDelayMs
  );

  // Add jitter to avoid thundering herd
  const jitter = Math.random() * 0.3 * delay;
  return delay + jitter;
}

/**
 * Execute a function with retry logic
 */
export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  toolName: string,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const fullConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= fullConfig.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      const errorType = classifyError(lastError, toolName);

      // Don't retry fatal errors
      if (errorType === ErrorType.FATAL) {
        throw lastError;
      }

      // Don't retry browser-blocked errors (need human intervention)
      if (errorType === ErrorType.BROWSER_BLOCKED) {
        throw lastError;
      }

      // Last attempt - give up
      if (attempt === fullConfig.maxRetries) {
        throw lastError;
      }

      // Wait before retry
      const delay = calculateDelay(attempt, fullConfig);
      console.log(`[Retry] ${toolName} failed (attempt ${attempt + 1}/${fullConfig.maxRetries + 1}), retrying in ${delay.toFixed(0)}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

/**
 * Execute a function with timeout
 */
export async function executeWithTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  toolName: string
): Promise<T> {
  let timeoutHandle: NodeJS.Timeout | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(`Tool execution timeout: ${toolName} exceeded ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([
      fn(),
      timeoutPromise
    ]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

/**
 * Combined timeout + retry execution
 */
export async function executeWithRetryAndTimeout<T>(
  fn: () => Promise<T>,
  toolName: string,
  options: {
    timeout?: number;
    retry?: Partial<RetryConfig>;
  } = {}
): Promise<T> {
  const timeout = options.timeout ?? 30000; // 30 second default

  return executeWithRetry(
    () => executeWithTimeout(fn, timeout, toolName),
    toolName,
    options.retry
  );
}
