/**
 * Cross-cutting constants. Business picklists (budget bands, timelines,
 * design styles, room lists) deliberately do NOT live here — those are
 * admin-editable rows in the OptionValue table.
 */

export const APP_NAME = 'Interior CRM'

/** Lead and project reference numbers: LEAD-2026-000421 / PRJ-2026-0001 */
export const LEAD_NUMBER_PREFIX = 'LEAD'
export const LEAD_NUMBER_PAD = 6
export const PROJECT_NUMBER_PREFIX = 'PRJ'
export const PROJECT_NUMBER_PAD = 4

export const PAGINATION = {
  defaultPageSize: 25,
  maxPageSize: 100,
} as const

/**
 * Upload allowlist. Enforced server-side on the presign request — the client
 * accept="" attribute is a convenience, not a control.
 */
export const ALLOWED_UPLOAD_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/pdf',
] as const

export type AllowedUploadMimeType = (typeof ALLOWED_UPLOAD_MIME_TYPES)[number]

export const UPLOAD_EXTENSION_BY_MIME: Record<AllowedUploadMimeType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'application/pdf': 'pdf',
}

/** Presigned upload URLs are short-lived; the browser uses them immediately. */
export const UPLOAD_URL_TTL_SECONDS = 300

/**
 * Spam heuristics for the public form. A real person cannot complete six
 * steps in under three seconds; a bot routinely does.
 */
export const MIN_FORM_COMPLETION_SECONDS = 3
export const HONEYPOT_FIELD_NAME = 'company_website'

/** Lead temperature bands. Scores below 50 are cold, 80+ is hot. */
export const TEMPERATURE_THRESHOLDS = {
  hot: 80,
  warm: 50,
} as const
