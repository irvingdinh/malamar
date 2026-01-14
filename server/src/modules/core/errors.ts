/**
 * Core Module - Error Types
 *
 * Standard error response format: { error: { code, message, details? } }
 */

export interface ErrorDetails {
  [key: string]: string | undefined
}

export interface ErrorResponse {
  error: {
    code: string
    message: string
    details?: ErrorDetails
  }
}

export class AppError extends Error {
  public readonly statusCode: number
  public readonly code: string
  public readonly details?: ErrorDetails

  constructor(
    message: string,
    statusCode: number,
    code: string,
    details?: ErrorDetails
  ) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.code = code
    this.details = details
  }

  toResponse(): ErrorResponse {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details && { details: this.details }),
      },
    }
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', details?: ErrorDetails) {
    super(message, 404, 'NOT_FOUND', details)
    this.name = 'NotFoundError'
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string = 'Invalid request',
    details?: ErrorDetails
  ) {
    super(message, 400, 'VALIDATION_ERROR', details)
    this.name = 'ValidationError'
  }
}

export class ConflictError extends AppError {
  constructor(
    message: string = 'Resource conflict',
    details?: ErrorDetails
  ) {
    super(message, 409, 'CONFLICT', details)
    this.name = 'ConflictError'
  }
}

export class DatabaseError extends AppError {
  constructor(
    message: string = 'Database operation failed',
    details?: ErrorDetails
  ) {
    super(message, 500, 'DATABASE_ERROR', details)
    this.name = 'DatabaseError'
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}
