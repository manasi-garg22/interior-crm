import { describe, expect, it } from 'vitest'
import { formatReference } from '@crm/database/reference-numbers'

describe('reference number formatting', () => {
  it('matches the documented lead format', () => {
    expect(formatReference('LEAD', 2026, 421, 6)).toBe('LEAD-2026-000421')
  })

  it('matches the documented project format', () => {
    expect(formatReference('PRJ', 2026, 1, 4)).toBe('PRJ-2026-0001')
  })

  it('does not truncate once the counter exceeds the padding', () => {
    expect(formatReference('LEAD', 2026, 1_234_567, 6)).toBe('LEAD-2026-1234567')
  })

  it('sorts lexicographically in creation order within a year', () => {
    const numbers = [1, 2, 10, 100, 1000].map((n) => formatReference('LEAD', 2026, n, 6))
    expect([...numbers].sort()).toEqual(numbers)
  })
})
