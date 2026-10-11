import { startOfBusinessDay, startOfNextBusinessDay } from '@/lib/time'

/**
 * Follow-up queue boundaries.
 *
 * Separated from the service and parameterised on `now` so the boundaries
 * are testable. "Today" is a local-midnight-to-midnight window, and the
 * off-by-one at either end is precisely the bug that makes a 9am call
 * silently disappear from the queue.
 */

export type Bucket = 'today' | 'upcoming' | 'overdue' | 'completed'

export type BucketWindow = {
  status: 'PENDING' | 'COMPLETED'
  from?: Date
  /** Exclusive. */
  to?: Date
}

/** IST midnight — the server runs in UTC, so "local" midnight would be 5:30am IST. */
export function startOfDay(now: Date): Date {
  return startOfBusinessDay(now)
}

export function bucketWindow(bucket: Bucket, now: Date = new Date()): BucketWindow {
  const todayStart = startOfDay(now)
  const tomorrowStart = startOfNextBusinessDay(now)

  switch (bucket) {
    case 'overdue':
      // Anything still pending from before today, however old.
      return { status: 'PENDING', to: todayStart }
    case 'today':
      return { status: 'PENDING', from: todayStart, to: tomorrowStart }
    case 'upcoming':
      return { status: 'PENDING', from: tomorrowStart }
    case 'completed':
      return { status: 'COMPLETED' }
  }
}

export function isBucket(value: string | undefined): value is Bucket {
  return value === 'today' || value === 'upcoming' || value === 'overdue' || value === 'completed'
}

/** Which queue a given follow-up belongs in. */
export function bucketOf(
  followUp: { status: string; scheduledAt: Date },
  now: Date = new Date(),
): Bucket {
  if (followUp.status === 'COMPLETED') return 'completed'

  const todayStart = startOfDay(now)
  const tomorrowStart = startOfNextBusinessDay(now)

  if (followUp.scheduledAt < todayStart) return 'overdue'
  if (followUp.scheduledAt < tomorrowStart) return 'today'
  return 'upcoming'
}
