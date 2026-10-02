/**
 * Values that are safe to ship to the browser.
 *
 * These must be referenced as full literal `process.env.NEXT_PUBLIC_*`
 * expressions — Next.js inlines them at build time by textual substitution,
 * so dynamic lookups like process.env[key] silently produce undefined.
 */
export type PublicEnv = {
  appUrl: string
  companyName: string
  companyPhone: string
  companyWhatsApp: string
  turnstileSiteKey: string | undefined
}

export function getPublicEnv(): PublicEnv {
  return {
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
    companyName: process.env.NEXT_PUBLIC_COMPANY_NAME ?? 'Interior Studio',
    companyPhone: process.env.NEXT_PUBLIC_COMPANY_PHONE ?? '',
    companyWhatsApp: process.env.NEXT_PUBLIC_COMPANY_WHATSAPP ?? '',
    turnstileSiteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || undefined,
  }
}
