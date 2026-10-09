/**
 * Values that are safe to ship to the browser.
 *
 * These must be referenced as full literal `process.env.NEXT_PUBLIC_*`
 * expressions — Next.js inlines them at build time by textual substitution,
 * so dynamic lookups like process.env[key] silently produce undefined.
 */
export type PublicEnv = {
  appUrl: string
  /** Short name for tight spots: header, sidebar, tab titles. */
  companyName: string
  /** Full registered name, shown where there is room: footer, copyright. */
  companyFullName: string
  companyPhone: string
  companyWhatsApp: string
  companyEmail: string
  companyAddress: string
  portfolioUrl: string
  instagramUrl: string
  /** File uploads need object storage (R2/B2). Off until it is configured. */
  uploadsEnabled: boolean
  turnstileSiteKey: string | undefined
}

export function getPublicEnv(): PublicEnv {
  return {
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
    companyName: process.env.NEXT_PUBLIC_COMPANY_NAME || 'OMA Designs',
    companyFullName: process.env.NEXT_PUBLIC_COMPANY_FULL_NAME || 'OM Arch Designs',
    companyPhone: process.env.NEXT_PUBLIC_COMPANY_PHONE ?? '',
    companyWhatsApp: process.env.NEXT_PUBLIC_COMPANY_WHATSAPP ?? '',
    companyEmail: process.env.NEXT_PUBLIC_COMPANY_EMAIL ?? '',
    companyAddress: process.env.NEXT_PUBLIC_COMPANY_ADDRESS || 'Vadodara, Gujarat',
    portfolioUrl: process.env.NEXT_PUBLIC_PORTFOLIO_URL ?? '',
    instagramUrl: process.env.NEXT_PUBLIC_INSTAGRAM_URL ?? '',
    uploadsEnabled: process.env.NEXT_PUBLIC_UPLOADS_ENABLED === 'true',
    turnstileSiteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || undefined,
  }
}
