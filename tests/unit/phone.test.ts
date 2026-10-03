import { describe, expect, it } from 'vitest'
import {
  normalizePhone,
  isValidPhone,
  phoneSchema,
  sanitizePhoneInput,
  PHONE_ERROR_MESSAGE,
} from '@crm/validation'

describe('phone normalization (the deduplication key)', () => {
  it('collapses every common Indian format to one canonical value', () => {
    const variants = [
      '9876543210',
      '+919876543210',
      '+91 98765 43210',
      '098765 43210',
      '+91-98765-43210',
      '  9876543210  ',
    ]

    const canonical = variants.map((v) => normalizePhone(v)?.e164)

    // If this ever fails, the same person submitting twice creates two
    // customer records — the exact duplicate the requirements forbid.
    expect(new Set(canonical)).toEqual(new Set(['+919876543210']))
  })

  it('exposes a readable national format for the UI', () => {
    expect(normalizePhone('+919876543210')?.national).toBe('098765 43210')
  })

  it('rejects numbers that are not valid', () => {
    expect(normalizePhone('12345')).toBeNull()
    expect(normalizePhone('abcdefghij')).toBeNull()
    expect(normalizePhone('')).toBeNull()
    expect(isValidPhone('99')).toBe(false)
  })

  it('honours an explicit country code over the India default', () => {
    expect(normalizePhone('+14155552671')?.e164).toBe('+14155552671')
    expect(normalizePhone('+14155552671')?.country).toBe('US')
  })

  it('normalizes through the Zod schema so services never see raw input', () => {
    expect(phoneSchema.parse('098765 43210')).toBe('+919876543210')
  })

  it('reports a usable message when the schema rejects', () => {
    const result = phoneSchema.safeParse('123')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(PHONE_ERROR_MESSAGE)
    }
  })

  it('rejects too many digits, letters and Indian landlines', () => {
    expect(normalizePhone('98765432101')).toBeNull() // 11 digits
    expect(normalizePhone('987654321098765')).toBeNull()
    expect(normalizePhone('abc9876543210')).toBeNull()
    expect(normalizePhone('98765x43210')).toBeNull()
    expect(normalizePhone('0265 2345678')).toBeNull() // Vadodara landline
    expect(normalizePhone('5876543210')).toBeNull() // mobiles start 6–9
    expect(normalizePhone('+1 415 555 2671 9999')).toBeNull()
  })
})

describe('phone keystroke filter', () => {
  it('stops at 10 digits for a plain Indian mobile', () => {
    expect(sanitizePhoneInput('98765432109999')).toBe('9876543210')
    expect(sanitizePhoneInput('98765 43210 99')).toBe('98765 43210 ')
  })

  it('allows the prefixes people really type', () => {
    expect(sanitizePhoneInput('09876543210999')).toBe('09876543210')
    expect(sanitizePhoneInput('+91 98765 43210 99')).toBe('+91 98765 43210 ')
    expect(sanitizePhoneInput('+14155552671')).toBe('+14155552671') // NRI clients
  })

  it('drops letters and stray plus signs', () => {
    expect(sanitizePhoneInput('98a76b54')).toBe('987654')
    expect(sanitizePhoneInput('+91+98765')).toBe('+9198765')
  })
})
