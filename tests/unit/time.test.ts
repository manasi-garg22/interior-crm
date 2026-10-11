import { describe, expect, it } from 'vitest'
import {
  businessDayEndFromCalendarDate,
  businessDayStartFromCalendarDate,
  formatDate,
  formatDateTime,
  istDate,
  startOfBusinessDay,
  startOfNextBusinessDay,
} from '../../apps/web/lib/time'

describe('India business time', () => {
  it('formats in IST regardless of the server timezone', () => {
    // 9:45 UTC is 3:15 pm in India.
    const instant = new Date(Date.UTC(2026, 9, 10, 9, 45))
    expect(formatDateTime(instant)).toMatch(/10 Oct.*3:15\s?pm/i)
    expect(formatDate(instant)).toBe('10 Oct 2026')
  })

  it('rolls the date over at IST midnight, not UTC midnight', () => {
    // 20:00 UTC on 9 Oct is already 1:30 am on 10 Oct in India.
    expect(formatDate(new Date(Date.UTC(2026, 9, 9, 20, 0)))).toBe('10 Oct 2026')
  })

  it('finds IST midnight from any instant of the day', () => {
    expect(startOfBusinessDay(istDate(2026, 9, 10, 0, 0))).toEqual(istDate(2026, 9, 10))
    expect(startOfBusinessDay(istDate(2026, 9, 10, 23, 59))).toEqual(istDate(2026, 9, 10))
    expect(startOfNextBusinessDay(istDate(2026, 9, 10, 12))).toEqual(istDate(2026, 9, 11))
  })

  it('turns a filter date into the full IST calendar day', () => {
    // z.coerce.date('2026-10-10') yields UTC midnight of that date.
    const fromFilter = new Date('2026-10-10')
    expect(businessDayStartFromCalendarDate(fromFilter)).toEqual(istDate(2026, 9, 10))
    expect(businessDayEndFromCalendarDate(fromFilter)).toEqual(istDate(2026, 9, 10, 23, 59, 59, 999))
  })
})
