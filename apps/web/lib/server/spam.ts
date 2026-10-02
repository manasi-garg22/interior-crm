import { getEnv, isCaptchaConfigured, MIN_FORM_COMPLETION_SECONDS } from '@crm/config'
import { logger } from './logger'

/**
 * Layered spam protection for the public form.
 *
 * No single check is reliable on its own, and each has a different failure
 * mode, so they run together:
 *   1. honeypot   — catches naive bots, zero friction for real users
 *   2. timing     — catches scripted submissions, zero friction
 *   3. Turnstile  — catches the rest, but only when keys are configured
 *   4. rate limit — bounds the damage from anything that gets through
 *
 * Checks 1–3 live here; the rate limit is applied by the route.
 */

const log = logger.child('spam')

export type SpamCheckInput = {
  honeypot: string | undefined
  startedAt: number | undefined
  turnstileToken: string | undefined
  remoteIp: string
}

export type SpamVerdict = { ok: true } | { ok: false; reason: string }

export async function checkSubmission(input: SpamCheckInput): Promise<SpamVerdict> {
  if (input.honeypot) {
    log.warn('honeypot filled', { remoteIp: input.remoteIp })
    return { ok: false, reason: 'honeypot' }
  }

  if (input.startedAt) {
    const elapsedSeconds = (Date.now() - input.startedAt) / 1000
    // Negative means a clock-skewed or forged timestamp; treat like too-fast.
    if (elapsedSeconds < MIN_FORM_COMPLETION_SECONDS) {
      log.warn('form completed implausibly fast', { elapsedSeconds })
      return { ok: false, reason: 'too_fast' }
    }
  }

  const captcha = await verifyTurnstile(input.turnstileToken, input.remoteIp)
  if (!captcha.ok) return captcha

  return { ok: true }
}

/**
 * Cloudflare Turnstile. When keys are absent the check is skipped entirely,
 * which is what keeps local development and tests working without an account.
 */
export async function verifyTurnstile(
  token: string | undefined,
  remoteIp: string,
): Promise<SpamVerdict> {
  const env = getEnv()

  if (!isCaptchaConfigured(env)) return { ok: true }

  if (!token) return { ok: false, reason: 'captcha_missing' }

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: env.TURNSTILE_SECRET_KEY,
        response: token,
        remoteip: remoteIp === 'unknown' ? undefined : remoteIp,
      }),
    })

    const result = (await response.json()) as { success?: boolean; 'error-codes'?: string[] }

    if (!result.success) {
      log.warn('turnstile rejected', { errors: result['error-codes'] })
      return { ok: false, reason: 'captcha_failed' }
    }

    return { ok: true }
  } catch (cause) {
    // Fail open. Turnstile being unreachable must not stop real customers
    // from submitting enquiries; the rate limit still bounds abuse.
    log.error('turnstile unreachable, allowing submission', { cause })
    return { ok: true }
  }
}
