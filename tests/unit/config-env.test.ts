import { afterEach, describe, expect, it } from 'vitest'
import { getEnv, resetEnvCache, isWhatsAppConfigured, isCaptchaConfigured } from '@crm/config'

const MINIMUM_VALID_ENV = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/interior_crm',
  AUTH_SECRET: 'x'.repeat(32),
}

function withEnv(overrides: Record<string, string | undefined>): void {
  resetEnvCache()
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
}

afterEach(() => {
  resetEnvCache()
})

describe('server environment parsing', () => {
  it('accepts a minimal valid environment and applies documented defaults', () => {
    withEnv({ ...MINIMUM_VALID_ENV, STORAGE_DRIVER: undefined, MAX_UPLOAD_MB: undefined })
    const env = getEnv()

    expect(env.STORAGE_DRIVER).toBe('local')
    expect(env.WHATSAPP_DRIVER).toBe('mock')
    expect(env.EMAIL_DRIVER).toBe('console')
    expect(env.MAX_UPLOAD_MB).toBe(15)
  })

  it('rejects a short AUTH_SECRET rather than booting insecurely', () => {
    withEnv({ ...MINIMUM_VALID_ENV, AUTH_SECRET: 'too-short' })
    expect(() => getEnv()).toThrow(/AUTH_SECRET must be at least 32 characters/)
  })

  it('names every offending variable in one error', () => {
    withEnv({ DATABASE_URL: '', AUTH_SECRET: 'short' })
    expect(() => getEnv()).toThrow(/DATABASE_URL[\s\S]*AUTH_SECRET|AUTH_SECRET[\s\S]*DATABASE_URL/)
  })

  it('coerces numeric strings into numbers', () => {
    withEnv({ ...MINIMUM_VALID_ENV, MAX_UPLOAD_MB: '25' })
    expect(getEnv().MAX_UPLOAD_MB).toBe(25)
  })

  it('treats a driver with missing credentials as unconfigured', () => {
    withEnv({
      ...MINIMUM_VALID_ENV,
      WHATSAPP_DRIVER: 'cloud_api',
      WHATSAPP_ACCESS_TOKEN: undefined,
      WHATSAPP_PHONE_NUMBER_ID: undefined,
    })
    // Declaring the live driver is not enough — this is what keeps the CRM
    // working on mock instead of failing at send time.
    expect(isWhatsAppConfigured(getEnv())).toBe(false)
  })

  it('reports CAPTCHA as unconfigured when keys are absent', () => {
    withEnv({ ...MINIMUM_VALID_ENV, TURNSTILE_SITE_KEY: undefined, TURNSTILE_SECRET_KEY: undefined })
    expect(isCaptchaConfigured(getEnv())).toBe(false)
  })
})
