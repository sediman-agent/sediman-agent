/**
 * Base error class for all application errors
 * Provides tagging and type narrowing capabilities
 */

export type ErrorCode =
  | 'NETWORK_ERROR'
  | 'RPC_ERROR'
  | 'VALIDATION_ERROR'
  | 'AGENT_ERROR'
  | 'TASK_ERROR'
  | 'SKILL_ERROR'
  | 'MEMORY_ERROR'
  | 'BROWSER_ERROR'
  | 'UNKNOWN_ERROR';

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ErrorMetadata {
  code: ErrorCode;
  severity: ErrorSeverity;
  recoverable: boolean;
  details?: Record<string, unknown>;
}

export abstract class AppError extends Error {
  readonly _tag: string = 'AppError';
  abstract readonly code: ErrorCode;
  abstract readonly severity: ErrorSeverity;
  abstract readonly recoverable: boolean;
  readonly metadata: ErrorMetadata;
  readonly timestamp: Date;

  constructor(
    message: string,
    metadata: ErrorMetadata,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = this.constructor.name;
    this.metadata = metadata;
    this.timestamp = new Date();
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      severity: this.severity,
      recoverable: this.recoverable,
      metadata: this.metadata,
      timestamp: this.timestamp.toISOString(),
    };
  }
}

/**
 * Type guard for AppError
 */
export function isAppError(error: unknown): error is AppError {
  return (
    error instanceof Error &&
    '_tag' in error &&
    (error as AppError)._tag === 'AppError'
  );
}

/**
 * Get user-friendly error message
 */
export function getUserMessage(error: unknown): string {
  if (isAppError(error)) {
    switch (error.code) {
      case 'NETWORK_ERROR':
        return 'Network connection failed. Please check your connection.';
      case 'RPC_ERROR':
        return 'Backend communication failed. Please try again.';
      case 'VALIDATION_ERROR':
        return error.message;
      case 'AGENT_ERROR':
        return 'Agent encountered an error. Please try again.';
      case 'TASK_ERROR':
        return 'Task execution failed.';
      case 'SKILL_ERROR':
        return 'Skill execution failed.';
      case 'MEMORY_ERROR':
        return 'Memory operation failed.';
      case 'BROWSER_ERROR':
        return 'Browser automation failed.';
      default:
        return 'An unexpected error occurred.';
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred.';
}
