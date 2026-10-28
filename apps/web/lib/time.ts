/**
 * Business time — every date the CRM shows or reasons about is India time.
 *
 * Vercel runs functions in UTC and does not allow the TZ variable to be
 * changed, so nothing here may rely on the server's local timezone. Display
 * formatting passes `timeZone` explicitly; day boundaries ("today",
 * "overdue") are computed against IST midnight.
 *
 * India has a fixed +05:30 offset with no daylight saving, which is what
 * makes the arithmetic below exact.
 */

export const BUSINESS_TIME_ZONE = 'Asia/Kolkata'
const IST_OFFSET_MS = (5 * 60 + 30) * 60_000
const DAY_MS = 86_400_000

/** "10 Oct 2026" */
export function formatDate(date: Date, options: Intl.DateTimeFormatOptions = {}): string {
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...options,
    timeZone: BUSINESS_TIME_ZONE,
  })
}

/** "10 Oct, 3:45 pm" */
export function formatDateTime(date: Date, options: Intl.DateTimeFormatOptions = {}): string {
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    ...options,
    timeZone: BUSINESS_TIME_ZONE,
  })
}

/** The instant IST midnight began on the IST calendar day containing `now`. */
export function startOfBusinessDay(now: Date): Date {
  const shifted = new Date(now.getTime() + IST_OFFSET_MS)
  const midnightUtc = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate())
  return new Date(midnightUtc - IST_OFFSET_MS)
}

export function startOfNextBusinessDay(now: Date): Date {
  return new Date(startOfBusinessDay(now).getTime() + DAY_MS)
}

/**
 * IST midnight for a calendar date such as the one `z.coerce.date()` makes
 * from "2026-10-10" (UTC midnight of that date).
 */
export function businessDayStartFromCalendarDate(calendarDate: Date): Date {
  return new Date(
    Date.UTC(calendarDate.getUTCFullYear(), calendarDate.getUTCMonth(), calendarDate.getUTCDate()) -
      IST_OFFSET_MS,
  )
}

/** Last millisecond of that IST calendar day. */
export function businessDayEndFromCalendarDate(calendarDate: Date): Date {
  return new Date(businessDayStartFromCalendarDate(calendarDate).getTime() + DAY_MS - 1)
}

/** Builds an IST wall-clock time as an instant — mainly for tests. */
export function istDate(year: number, monthIndex: number, day: number, hour = 0, minute = 0, second = 0, ms = 0): Date {
  return new Date(Date.UTC(year, monthIndex, day, hour, minute, second, ms) - IST_OFFSET_MS)
}

/**
 * Converts an <input type="datetime-local"> value ("2026-10-10T15:00") into
 * a full ISO instant using the browser's own timezone. Call this in the
 * browser before sending: the server alone cannot know which timezone the
 * person meant.
 */
export function localInputToIso(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toISOString()
}

/** "2026-10" for the current month in IST. */
export function currentIstMonth(now: Date = new Date()): string {
  const ist = new Date(now.getTime() + IST_OFFSET_MS)
  return `${ist.getUTCFullYear()}-${String(ist.getUTCMonth() + 1).padStart(2, '0')}`
}

/**
 * The instants bounding an IST calendar month, e.g. "2026-10" →
 * 1 Oct 00:00 IST (inclusive) to 1 Nov 00:00 IST (exclusive).
 * Returns null for anything that is not a valid yyyy-mm.
 */
export function istMonthRange(month: string): { from: Date; to: Date } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(month)
  if (!match) return null
  const year = Number(match[1])
  const index = Number(match[2]) - 1
  if (year < 2000 || year > 2100 || index < 0 || index > 11) return null
  const offset = IST_OFFSET_MS
  return {
    from: new Date(Date.UTC(year, index, 1) - offset),
    to: new Date(Date.UTC(year, index + 1, 1) - offset),
  }
}

