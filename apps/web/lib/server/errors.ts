/**
 * Typed application errors.
 *
 * Services throw these; the action wrapper and route handlers translate them
 * into a status code and a message that is safe to show a user. Anything that
 * is not an AppError is treated as an unexpected fault: logged with its stack,
 * reported to the user as a generic message, never leaked verbatim.
 */

export type AppErrorCode =
  | 'VALIDATION'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'UPLOAD_REJECTED'
  | 'INTEGRATION_UNAVAILABLE'
  | 'INTERNAL'

const STATUS_BY_CODE: Record<AppErrorCode, number> = {
  VALIDATION: 422,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  UPLOAD_REJECTED: 400,
  INTEGRATION_UNAVAILABLE: 503,
  INTERNAL: 500,
}

export class AppError extends Error {
  readonly code: AppErrorCode
  readonly status: number
  readonly fieldErrors: Record<string, string[]> | undefined
  /** True when the message was written for an end user to read. */
  readonly safeToExpose: boolean

  constructor(
    code: AppErrorCode,
    message: string,
    options: { fieldErrors?: Record<string, string[]>; safeToExpose?: boolean; cause?: unknown } = {},
  ) {
    super(message, options.cause ? { cause: options.cause } : undefined)
    this.name = 'AppError'
    this.code = code
    this.status = STATUS_BY_CODE[code]
    this.fieldErrors = options.fieldErrors
    this.safeToExpose = options.safeToExpose ?? true
  }
}

export class ValidationError extends AppError {
  constructor(message: string, fieldErrors?: Record<string, string[]>) {
    super('VALIDATION', message, { fieldErrors })
    this.name = 'ValidationError'
  }
}

export class UnauthenticatedError extends AppError {
  constructor(message = 'You need to sign in to continue.') {
    super('UNAUTHENTICATED', message)
    this.name = 'UnauthenticatedError'
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to do that.') {
    super('FORBIDDEN', message)
    this.name = 'ForbiddenError'
  }
}

export class NotFoundError extends AppError {
  constructor(entity = 'Record') {
    super('NOT_FOUND', `${entity} not found.`)
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super('CONFLICT', message)
    this.name = 'ConflictError'
  }
}

export class RateLimitError extends AppError {
  readonly retryAfterSeconds: number
  constructor(retryAfterSeconds: number, message = 'Too many requests. Please try again shortly.') {
    super('RATE_LIMITED', message)
    this.name = 'RateLimitError'
    this.retryAfterSeconds = retryAfterSeconds
  }
}

export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError
}

/**
 * Collapses anything thrown into a user-safe shape. Unknown faults never
 * expose their message, because stack traces and driver errors routinely
 * contain connection strings and row contents.
 */
export function toUserFacingError(error: unknown): {
  code: AppErrorCode
  status: number
  message: string
  fieldErrors?: Record<string, string[]>
} {
  if (isAppError(error) && error.safeToExpose) {
    return {
      code: error.code,
      status: error.status,
      message: error.message,
      ...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}),
    }
  }
  return {
    code: 'INTERNAL',
    status: 500,
    message: 'Something went wrong on our side. Please try again.',
  }
}
