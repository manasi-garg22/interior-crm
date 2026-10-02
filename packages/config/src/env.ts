import { z } from 'zod'

/**
 * Server-side environment contract.
 *
 * Parsed lazily on first access rather than at import time, so that importing
 * a module that merely *mentions* env does not blow up tooling (tests, the
 * Prisma CLI, type generation) that has no need for a complete environment.
 *
 * Nothing in here may ever reach the browser bundle. See public-env.ts for
 * values that are safe to expose.
 */

const stringBoolean = z
  .enum(['true', 'false', '1', '0', ''])
  .transform((v) => v === 'true' || v === '1')

const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === '' ? undefined : v))

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  NEXT_PUBLIC_APP_URL: z.url().default('http://localhost:3000'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DIRECT_DATABASE_URL: optionalString,

  AUTH_SECRET: z.string().min(32, 'AUTH_SECRET must be at least 32 characters'),
  AUTH_URL: z.url().optional(),
  AUTH_TRUST_HOST: stringBoolean.default(true),
  SESSION_MAX_AGE_SECONDS: z.coerce.number().int().positive().default(28_800),

  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  S3_ENDPOINT: optionalString,
  S3_REGION: z.string().default('ap-south-1'),
  S3_ACCESS_KEY: optionalString,
  S3_SECRET_KEY: optionalString,
  S3_BUCKET: optionalString,
  S3_FORCE_PATH_STYLE: stringBoolean.default(true),
  MAX_UPLOAD_MB: z.coerce.number().int().positive().max(100).default(15),

  WHATSAPP_DRIVER: z.enum(['mock', 'cloud_api']).default('mock'),
  WHATSAPP_ACCESS_TOKEN: optionalString,
  WHATSAPP_PHONE_NUMBER_ID: optionalString,
  WHATSAPP_BUSINESS_ACCOUNT_ID: optionalString,
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: optionalString,

  META_DRIVER: z.enum(['mock', 'graph_api']).default('mock'),
  META_ACCESS_TOKEN: optionalString,
  META_APP_SECRET: optionalString,
  META_VERIFY_TOKEN: optionalString,

  EMAIL_DRIVER: z.enum(['console', 'resend']).default('console'),
  EMAIL_API_KEY: optionalString,
  EMAIL_FROM: z.string().default('Interior Studio <noreply@example.com>'),
  SALES_NOTIFICATION_EMAIL: optionalString,

  TURNSTILE_SITE_KEY: optionalString,
  TURNSTILE_SECRET_KEY: optionalString,
  RATE_LIMIT_DRIVER: z.enum(['memory', 'postgres']).default('memory'),
  PUBLIC_FORM_RATE_LIMIT_PER_HOUR: z.coerce.number().int().positive().default(5),
  LOGIN_RATE_LIMIT_PER_15MIN: z.coerce.number().int().positive().default(5),

  COMPANY_NAME: z.string().default('Interior Studio'),
  COMPANY_PHONE: z.string().default('+911234567890'),
  COMPANY_WHATSAPP: z.string().default('+911234567890'),
  DEFAULT_COUNTRY: z.string().length(2).default('IN'),
  LEAD_ASSIGNMENT_STRATEGY: z.enum(['round_robin', 'unassigned']).default('round_robin'),

  SEED_SUPER_ADMIN_EMAIL: optionalString,
  SEED_SUPER_ADMIN_PASSWORD: optionalString,
})

export type ServerEnv = z.infer<typeof serverEnvSchema>

let cached: ServerEnv | undefined

export function getEnv(): ServerEnv {
  if (cached) return cached

  // Checked via globalThis rather than a bare `window`, because this package
  // is compiled without the DOM lib.
  if (typeof globalThis !== 'undefined' && 'window' in globalThis) {
    throw new Error(
      'getEnv() was called in the browser. Server configuration must never reach the client bundle — use getPublicEnv() instead.',
    )
  }

  const parsed = serverEnvSchema.safeParse(process.env)

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  • ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n')
    throw new Error(
      `Invalid environment configuration:\n${issues}\n\nCheck your .env against .env.example.`,
    )
  }

  cached = parsed.data
  return cached
}

/** Test helper — drops the memoized parse so a suite can swap process.env. */
export function resetEnvCache(): void {
  cached = undefined
}

/**
 * Credential completeness checks. A driver is only "configured" when every
 * value it needs is present, which is what lets the app fall back to mock
 * implementations instead of failing at call time.
 */
export function isWhatsAppConfigured(env: ServerEnv = getEnv()): boolean {
  return (
    env.WHATSAPP_DRIVER === 'cloud_api' &&
    Boolean(env.WHATSAPP_ACCESS_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID)
  )
}

export function isMetaConfigured(env: ServerEnv = getEnv()): boolean {
  return (
    env.META_DRIVER === 'graph_api' && Boolean(env.META_ACCESS_TOKEN && env.META_APP_SECRET)
  )
}

export function isS3Configured(env: ServerEnv = getEnv()): boolean {
  return (
    env.STORAGE_DRIVER === 's3' &&
    Boolean(env.S3_ACCESS_KEY && env.S3_SECRET_KEY && env.S3_BUCKET)
  )
}

export function isEmailConfigured(env: ServerEnv = getEnv()): boolean {
  return env.EMAIL_DRIVER === 'resend' && Boolean(env.EMAIL_API_KEY)
}

export function isCaptchaConfigured(env: ServerEnv = getEnv()): boolean {
  return Boolean(env.TURNSTILE_SITE_KEY && env.TURNSTILE_SECRET_KEY)
}
