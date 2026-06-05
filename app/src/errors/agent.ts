/**
 * Agent execution errors
 */

import { AppError, type ErrorCode, type ErrorMetadata, type ErrorSeverity } from './base';

export class AgentError extends AppError {
  readonly _tag: string = 'AgentError';
  readonly code: ErrorCode = 'AGENT_ERROR';
  readonly severity: ErrorSeverity = 'medium';
  readonly recoverable = true;

  constructor(
    message: string,
    metadata?: Partial<ErrorMetadata>
  ) {
    super(message, {
      code: 'AGENT_ERROR',
      severity: 'medium',
      recoverable: true,
      ...metadata,
    });
  }
}

export class TaskExecutionError extends AgentError {
  readonly _tag: string = 'TaskExecutionError';

  constructor(task: string, error: string) {
    super(
      `Task execution failed: ${task}`,
      { details: { task, error } }
    );
  }
}

export class AgentInterruptedError extends AgentError {
  readonly _tag: string = 'AgentInterruptedError';

  constructor() {
    super('Agent execution was interrupted by user');
  }
}
