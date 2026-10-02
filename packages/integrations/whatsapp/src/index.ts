import { getEnv, isWhatsAppConfigured } from '@crm/config'

/**
 * Provider-agnostic WhatsApp contract.
 *
 * Deliberately NOT modelled on any one vendor's payload shape. The official
 * WhatsApp Business Platform is the intended first real driver, but nothing
 * above this interface knows that. Unofficial WhatsApp Web automation is out
 * of scope permanently — it violates WhatsApp's terms and gets numbers banned.
 */

export type WhatsAppTemplateKey =
  | 'lead_received'
  | 'consultation_confirmation'
  | 'site_visit_confirmation'
  | 'follow_up'
  | 'quotation_shared'
  | 'project_confirmation'

export type SendTemplateInput = {
  /** E.164, e.g. +919876543210 */
  to: string
  template: WhatsAppTemplateKey
  /** Ordered body substitutions for the approved template. */
  variables: string[]
  languageCode?: string
}

export type SendResult =
  | { ok: true; externalId: string; driver: string }
  | { ok: false; error: string; driver: string; retryable: boolean }

export interface WhatsAppClient {
  readonly driver: string
  readonly isLive: boolean
  sendTemplate(input: SendTemplateInput): Promise<SendResult>
}

/**
 * Mock driver. Records the send and succeeds. Used whenever credentials are
 * absent so that lead capture, notifications and tests all work unchanged.
 */
export class MockWhatsAppClient implements WhatsAppClient {
  readonly driver = 'mock'
  readonly isLive = false

  public readonly sent: SendTemplateInput[] = []

  async sendTemplate(input: SendTemplateInput): Promise<SendResult> {
    this.sent.push(input)
    return {
      ok: true,
      externalId: `mock-wa-${Date.now()}-${this.sent.length}`,
      driver: this.driver,
    }
  }
}

let client: WhatsAppClient | undefined

export function getWhatsAppClient(): WhatsAppClient {
  if (client) return client
  // The cloud_api driver lands in Phase 4. Until then — and whenever
  // credentials are missing — the mock keeps the CRM fully functional.
  if (isWhatsAppConfigured(getEnv())) {
    console.warn(
      '[whatsapp] cloud_api credentials present but driver not implemented yet; using mock',
    )
  }
  client = new MockWhatsAppClient()
  return client
}

export function setWhatsAppClient(next: WhatsAppClient | undefined): void {
  client = next
}

/**
 * Deep link for the "Open WhatsApp" button on the lead page. This is a plain
 * https://wa.me link — no API, no credentials, works today.
 */
export function buildWhatsAppDeepLink(phoneE164: string, message?: string): string {
  const digits = phoneE164.replace(/\D/g, '')
  const base = `https://wa.me/${digits}`
  return message ? `${base}?text=${encodeURIComponent(message)}` : base
}
