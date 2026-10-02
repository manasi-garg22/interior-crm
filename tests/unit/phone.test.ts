import { describe, expect, it } from 'vitest'
import { normalizePhone, isValidPhone, phoneSchema } from '@crm/validation'

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
      expect(result.error.issues[0]?.message).toBe('Enter a valid phone number')
    }
  })
})
