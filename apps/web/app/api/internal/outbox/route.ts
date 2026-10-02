import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { getEnv } from '@crm/config'
import { dispatchPending } from '@/lib/events/dispatcher'

/**
 * Scheduled outbox drain.
 *
 * The after-response dispatch handles the common case; this endpoint is the
 * safety net that retries anything which failed, and it is what a cron
 * scheduler should call every minute.
 *
 * Authenticated with a bearer token compared in constant time — a plain
 * `===` on a secret leaks its prefix through response timing.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const env = getEnv()

  const provided = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? ''
  if (!matches(provided, env.AUTH_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await dispatchPending()
  return NextResponse.json(result)
}

function matches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
