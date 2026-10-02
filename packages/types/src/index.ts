/**
 * Shared DTO and result types.
 *
 * Domain entity types are derived from the Prisma schema in @crm/database and
 * mapped to DTOs per module; this package holds the shapes that cross module
 * boundaries and the generic envelopes used by services and Server Actions.
 */

/** Discriminated result envelope. Services return these instead of throwing. */
export type Ok<T> = { ok: true; data: T }
export type Err<E = string> = { ok: false; error: E; fieldErrors?: Record<string, string[]> }
export type Result<T, E = string> = Ok<T> | Err<E>

export function ok<T>(data: T): Ok<T> {
  return { ok: true, data }
}

export function err<E = string>(error: E, fieldErrors?: Record<string, string[]>): Err<E> {
  return fieldErrors ? { ok: false, error, fieldErrors } : { ok: false, error }
}

/** Cursor-free, offset-based pagination — the leads table needs page numbers. */
export type PageRequest = {
  page: number
  pageSize: number
}

export type Paginated<T> = {
  items: T[]
  total: number
  page: number
  pageSize: number
  pageCount: number
}

export type SortDirection = 'asc' | 'desc'
