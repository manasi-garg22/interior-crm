import { describe, expect, it } from 'vitest'
import {
  bucketOf,
  bucketWindow,
  isBucket,
  startOfDay,
} from '../../apps/web/lib/modules/followup/buckets'

// A mid-afternoon "now", so boundaries are not accidentally satisfied by
// the test clock sitting at midnight.
const NOW = new Date(2026, 8, 30, 15, 30, 0)

describe('follow-up queue boundaries', () => {
  it('treats today as local midnight to midnight', () => {
    const window = bucketWindow('today', NOW)
    expect(window.from).toEqual(new Date(2026, 8, 30, 0, 0, 0))
    expect(window.to).toEqual(new Date(2026, 9, 1, 0, 0, 0))
    expect(window.status).toBe('PENDING')
  })

  it('makes overdue everything pending before today started', () => {
    const window = bucketWindow('overdue', NOW)
    expect(window.to).toEqual(startOfDay(NOW))
    expect(window.from).toBeUndefined()
  })

  it('starts upcoming at tomorrow, leaving no gap after today', () => {
    // If these two disagreed, a follow-up could fall into neither queue.
    expect(bucketWindow('upcoming', NOW).from).toEqual(bucketWindow('today', NOW).to)
  })

  it('ignores the clock for the completed queue', () => {
    expect(bucketWindow('completed', NOW)).toEqual({ status: 'COMPLETED' })
  })
})

describe('classifying a follow-up', () => {
  const pending = (date: Date) => ({ status: 'PENDING', scheduledAt: date })

  it('puts an earlier time today in the today queue, not overdue', () => {
    // 9am when it is now 3:30pm: still today's work, not yesterday's debt.
    expect(bucketOf(pending(new Date(2026, 8, 30, 9, 0)), NOW)).toBe('today')
  })

  it('classifies the exact first instant of today as today', () => {
    expect(bucketOf(pending(new Date(2026, 8, 30, 0, 0, 0)), NOW)).toBe('today')
  })

  it('classifies one millisecond before midnight as overdue', () => {
    expect(bucketOf(pending(new Date(2026, 8, 29, 23, 59, 59, 999)), NOW)).toBe('overdue')
  })

  it('classifies the first instant of tomorrow as upcoming', () => {
    expect(bucketOf(pending(new Date(2026, 9, 1, 0, 0, 0)), NOW)).toBe('upcoming')
  })

  it('classifies the last instant of today as today', () => {
    expect(bucketOf(pending(new Date(2026, 8, 30, 23, 59, 59, 999)), NOW)).toBe('today')
  })

  it('never calls a completed follow-up overdue, however old', () => {
    expect(
      bucketOf({ status: 'COMPLETED', scheduledAt: new Date(2020, 0, 1) }, NOW),
    ).toBe('completed')
  })
})

describe('bucket parsing from the query string', () => {
  it('accepts the four known queues', () => {
    for (const value of ['today', 'upcoming', 'overdue', 'completed']) {
      expect(isBucket(value)).toBe(true)
    }
  })

  it('rejects anything else', () => {
    expect(isBucket('everything')).toBe(false)
    expect(isBucket(undefined)).toBe(false)
  })
})
