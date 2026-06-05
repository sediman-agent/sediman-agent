/**
 * RPC communication errors
 */

import { AppError, type ErrorCode, type ErrorMetadata, type ErrorSeverity } from './base';

export class RPCError extends AppError {
  readonly _tag: string = 'RPCError';
  readonly code: ErrorCode = 'RPC_ERROR';
  readonly severity: ErrorSeverity = 'medium';
  readonly recoverable = true;

  constructor(
    message: string,
    metadata?: Partial<ErrorMetadata>
  ) {
    super(message, {
      code: 'RPC_ERROR',
      severity: 'medium',
      recoverable: true,
      ...metadata,
    });
  }
}

export class RPCRequestError extends RPCError {
  readonly _tag: string = 'RPCRequestError';

  constructor(method: string, error: string) {
    super(
      `RPC request failed: ${method}`,
      { details: { method, error } }
    );
  }
}

export class RPCResponseError extends RPCError {
  readonly _tag: string = 'RPCResponseError';

  constructor(method: string, response: unknown) {
    super(
      `Invalid RPC response from: ${method}`,
      { details: { method, response } }
    );
  }
}
