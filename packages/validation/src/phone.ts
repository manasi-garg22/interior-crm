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

export function normalizePhone(
  input: string,
  defaultCountry: CountryCode = DEFAULT_COUNTRY,
): NormalizedPhone | null {
  if (!input?.trim()) return null

  const parsed = parsePhoneNumberFromString(input.trim(), defaultCountry)
  if (!parsed?.isValid()) return null

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
      ctx.addIssue({
        code: 'custom',
        message: 'Enter a valid phone number',
      })
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
      ctx.addIssue({
        code: 'custom',
        message: 'Enter a valid phone number',
      })
      return z.NEVER
    }
    return normalized.e164
  })
