/**
 * Network-related errors
 */

import { AppError, type ErrorCode, type ErrorMetadata, type ErrorSeverity } from './base';

export class NetworkError extends AppError {
  readonly _tag: string = 'NetworkError';
  readonly code: ErrorCode = 'NETWORK_ERROR';
  readonly severity: ErrorSeverity = 'medium';
  readonly recoverable = true;

  constructor(
    message: string,
    metadata?: Partial<ErrorMetadata>
  ) {
    super(message, {
      code: 'NETWORK_ERROR',
      severity: 'medium',
      recoverable: true,
      ...metadata,
    });
  }
}

export class ConnectionRefusedError extends NetworkError {
  readonly _tag: string = 'ConnectionRefusedError';

  constructor(url: string) {
    super(
      `Connection refused to ${url}. Is the server running?`,
      { details: { url } }
    );
  }
}

export class TimeoutError extends NetworkError {
  readonly _tag: string = 'TimeoutError';

  constructor(operation: string, timeout: number) {
    super(
      `${operation} timed out after ${timeout}ms`,
      { details: { operation, timeout } }
    );
  }
}
