import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js'
import { z } from 'zod'

/**
 * Phone normalization.
 *
 * Customer.phone is the deduplication key for the whole CRM, so "9876543210",
 * "+91 98765 43210", "098765-43210" and "+919876543210" must all collapse to
 * one canonical value. Getting this wrong creates duplicate customers, which
 * is exactly what the requirements forbid.
 */

export const DEFAULT_COUNTRY: CountryCode = 'IN'

export type NormalizedPhone = {
  /** Canonical +<country><number>, suitable for storage and comparison. */
  e164: string
  /** Readable form for the UI. */
  national: string
  country: CountryCode | undefined
}

/** Digits plus the separators people actually type. Anything else is a typo. */
const ALLOWED_PHONE_CHARS = /^\+?[\d\s()-]+$/

/** E.164 caps every phone number in the world at 15 digits. */
const MAX_PHONE_DIGITS = 15

/** Indian mobiles: 10 digits starting 6–9. Landlines cannot take WhatsApp. */
const INDIAN_MOBILE = /^[6-9]\d{9}$/

export const PHONE_ERROR_MESSAGE = 'Enter a valid 10-digit mobile number, e.g. 98765 43210'

export function normalizePhone(
  input: string,
  defaultCountry: CountryCode = DEFAULT_COUNTRY,
): NormalizedPhone | null {
  const raw = input?.trim()
  if (!raw) return null

  // libphonenumber quietly ignores stray letters ("abc9876543210" parses), so
  // reject them up front rather than store something the customer did not mean.
  if (!ALLOWED_PHONE_CHARS.test(raw)) return null
  if (raw.replace(/\D/g, '').length > MAX_PHONE_DIGITS) return null

  const parsed = parsePhoneNumberFromString(raw, defaultCountry)
  if (!parsed?.isValid()) return null

  // Indian numbers must be mobiles — the team calls and WhatsApps every lead.
  if (parsed.countryCallingCode === '91' && !INDIAN_MOBILE.test(parsed.nationalNumber)) {
    return null
  }

  return {
    e164: parsed.number,
    national: parsed.formatNational(),
    country: parsed.country,
  }
}

export function isValidPhone(input: string, defaultCountry: CountryCode = DEFAULT_COUNTRY): boolean {
  return normalizePhone(input, defaultCountry) !== null
}

/**
 * Zod schema that validates AND normalizes in one step, so a service can
 * never accidentally persist the raw user input as the dedupe key.
 */
export const phoneSchema = z
  .string()
  .trim()
  .min(1, 'Phone number is required')
  .transform((value, ctx) => {
    const normalized = normalizePhone(value)
    if (!normalized) {
      ctx.addIssue({ code: 'custom', message: PHONE_ERROR_MESSAGE })
      return z.NEVER
    }
    return normalized.e164
  })

export const optionalPhoneSchema = z
  .string()
  .trim()
  .optional()
  .transform((value, ctx) => {
    if (!value) return undefined
    const normalized = normalizePhone(value)
    if (!normalized) {
      ctx.addIssue({ code: 'custom', message: PHONE_ERROR_MESSAGE })
      return z.NEVER
    }
    return normalized.e164
  })

/**
 * Keystroke filter for phone inputs: drops anything that is not a digit or a
 * separator, and stops accepting digits once the number is complete — 10 for
 * an Indian mobile, 11 with a leading 0, up to 15 with a +country code.
 * The schema above is still the real check; this only stops runaway typing.
 */
export function sanitizePhoneInput(value: string): string {
  const cleaned = value.replace(/[^\d\s+()-]/g, '').replace(/(?!^)\+/g, '')
  const trimmed = cleaned.trimStart()
  const maxDigits = trimmed.startsWith('+91')
    ? 12 // 91 + a 10-digit mobile
    : trimmed.startsWith('+')
      ? MAX_PHONE_DIGITS
      : trimmed.startsWith('0')
        ? 11
        : 10

  let digits = 0
  let out = ''
  for (const char of cleaned) {
    if (/\d/.test(char)) {
      if (digits === maxDigits) break
      digits += 1
    }
    out += char
  }
  return out
}
