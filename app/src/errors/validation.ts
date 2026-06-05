/**
 * Validation errors
 */

import { AppError, type ErrorCode, type ErrorMetadata, type ErrorSeverity } from './base';

export class ValidationError extends AppError {
  readonly _tag: string = 'ValidationError';
  readonly code: ErrorCode = 'VALIDATION_ERROR';
  readonly severity: ErrorSeverity = 'low';
  readonly recoverable = true;

  constructor(
    message: string,
    metadata?: Partial<ErrorMetadata>
  ) {
    super(message, {
      code: 'VALIDATION_ERROR',
      severity: 'low',
      recoverable: true,
      ...metadata,
    });
  }
}

export class SchemaValidationError extends ValidationError {
  readonly _tag: string = 'SchemaValidationError';

  constructor(
    field: string,
    issues: Array<{ message: string; path?: string[] }>
  ) {
    const issuesText = issues.map(i => `- ${i.message}`).join('\n');
    super(
      `Validation failed for ${field}:\n${issuesText}`,
      { details: { field, issues } }
    );
  }
}

export class TaskValidationError extends ValidationError {
  readonly _tag: string = 'TaskValidationError';

  constructor(reason: string) {
    super(`Task validation failed: ${reason}`);
  }
}
