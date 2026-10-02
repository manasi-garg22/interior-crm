import { createHash } from 'node:crypto'

/**
 * Fixed-window rate limiting.
 *
 * The in-memory driver is correct for a single instance, which is what this
 * app runs as today. It is explicitly NOT correct behind multiple replicas —
 * each would keep its own counter, multiplying the effective limit by the
 * replica count. Swap in a Redis or Postgres driver behind this same
 * interface before scaling out.
 */

export type RateLimitResult = {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
}

export interface RateLimiter {
  check(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult>
}

type Window = { count: number; resetAt: number }

export class MemoryRateLimiter implements RateLimiter {
  private readonly windows = new Map<string, Window>()
  private lastSweep = Date.now()

  async check(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
    const now = Date.now()
    this.sweep(now)

    const existing = this.windows.get(key)

    if (!existing || existing.resetAt <= now) {
      this.windows.set(key, { count: 1, resetAt: now + windowSeconds * 1000 })
      return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 }
    }

    existing.count += 1

    if (existing.count > limit) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
      }
    }

    return { allowed: true, remaining: limit - existing.count, retryAfterSeconds: 0 }
  }

  /** Without this the map grows forever on a long-running server. */
  private sweep(now: number): void {
    if (now - this.lastSweep < 60_000) return
    this.lastSweep = now
    for (const [key, window] of this.windows) {
      if (window.resetAt <= now) this.windows.delete(key)
    }
  }

  /** Test helper. */
  reset(): void {
    this.windows.clear()
  }
}

let limiter: RateLimiter = new MemoryRateLimiter()

export function getRateLimiter(): RateLimiter {
  return limiter
}

export function setRateLimiter(next: RateLimiter): void {
  limiter = next
}

/**
 * Client IPs arrive through proxy headers. Only the first entry of
 * X-Forwarded-For is meaningful, and it is hashed before storage or logging
 * because a raw IP is personal data we have no reason to retain.
 */
export function clientIpFrom(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for')
  const first = forwarded?.split(',')[0]?.trim()
  return first || headers.get('x-real-ip') || 'unknown'
}

export function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex').slice(0, 32)
}
