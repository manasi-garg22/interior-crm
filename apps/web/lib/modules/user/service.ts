import { createHash, randomBytes } from 'node:crypto'
import { getEnv } from '@crm/config'
import { getEmailProvider } from '@crm/email'
import { hashPassword, verifyPassword } from '@/lib/server/password'
import { getRateLimiter } from '@/lib/server/rate-limit'
import { logger } from '@/lib/server/logger'
import * as repository from './repository'

const log = logger.child('user.service')

export type AuthenticatedUser = {
  id: string
  email: string
  name: string
  role: string
  tokenVersion: number
}

/**
 * Credential verification.
 *
 * Every failure path returns the same null and takes roughly the same work,
 * so the endpoint cannot be used to enumerate which email addresses belong
 * to staff. The caller shows one generic message regardless of reason.
 */
export async function verifyCredentials(
  email: string,
  password: string,
): Promise<AuthenticatedUser | null> {
  const env = getEnv()
  const normalized = email.trim().toLowerCase()

  const limit = await getRateLimiter().check(
    `login:${normalized}`,
    env.LOGIN_RATE_LIMIT_PER_15MIN,
    900,
  )
  if (!limit.allowed) {
    log.warn('login throttled', { attemptsExceeded: true })
    return null
  }

  const user = await repository.findByEmail(normalized)

  if (!user) {
    // Hash anyway so a missing account is not measurably faster than a
    // wrong password.
    await verifyPassword(DUMMY_HASH, password)
    return null
  }

  const valid = await verifyPassword(user.passwordHash, password)
  if (!valid) return null

  if (!user.isActive || user.deletedAt) {
    log.warn('login attempt on disabled account', { userId: user.id })
    return null
  }

  await repository.recordLogin(user.id)

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tokenVersion: user.tokenVersion,
  }
}

/**
 * A structurally valid argon2id hash of a random value, used only to keep
 * the timing of a missing account close to that of a real one.
 */
const DUMMY_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHR2YWx1ZQ$J8p1pVQZ7h0kM0cVQ3tGx6dZ2Q9v0h1kY2mN3pQ4rS8'

/**
 * Re-checks a session against the database. Called from the JWT callback on
 * a rolling interval, which is what makes JWT sessions revocable: if the
 * account was disabled or tokenVersion bumped, the token stops working
 * within seconds rather than at its 8-hour expiry.
 */
export async function revalidateSession(
  userId: string,
  tokenVersion: number,
): Promise<AuthenticatedUser | null> {
  const user = await repository.findById(userId)

  if (!user || !user.isActive || user.deletedAt) return null
  if (user.tokenVersion !== tokenVersion) return null

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tokenVersion: user.tokenVersion,
  }
}

// ── Password reset ──────────────────────────────────────────

const RESET_TOKEN_TTL_MINUTES = 30

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * Always resolves the same way whether or not the address exists — the
 * response must not reveal who has an account.
 */
export async function requestPasswordReset(email: string, appUrl: string): Promise<void> {
  const user = await repository.findByEmail(email)
  if (!user || !user.isActive || user.deletedAt) return

  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60_000)

  // Only the digest is stored, so a database leak does not yield working
  // reset links.
  await repository.createResetToken(user.id, hashToken(token), expiresAt)

  const link = `${appUrl}/reset-password?token=${token}`

  await getEmailProvider().send({
    to: user.email,
    subject: 'Reset your password',
    html: `<p>Hello ${escapeHtml(user.name)},</p>
<p>Use the link below to choose a new password. It expires in ${RESET_TOKEN_TTL_MINUTES} minutes and can only be used once.</p>
<p><a href="${link}">Reset your password</a></p>
<p>If you did not ask for this, you can ignore this email.</p>`,
    text: `Reset your password: ${link}`,
  })
}

export type ResetOutcome = { ok: true } | { ok: false; reason: string }

export async function completePasswordReset(
  token: string,
  newPassword: string,
): Promise<ResetOutcome> {
  const record = await repository.findResetToken(hashToken(token))

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return { ok: false, reason: 'This reset link is invalid or has expired.' }
  }
  if (!record.user.isActive) {
    return { ok: false, reason: 'This account is no longer active.' }
  }

  await repository.updateUser(record.userId, {
    passwordHash: await hashPassword(newPassword),
    // Sign every other session out: a reset usually means the old password
    // was compromised.
    tokenVersion: { increment: 1 },
  })
  await repository.consumeResetToken(record.id)

  log.info('password reset completed', { userId: record.userId })
  return { ok: true }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
