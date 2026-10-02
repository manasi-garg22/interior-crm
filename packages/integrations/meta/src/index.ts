import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Meta (Instagram / Facebook) Lead Ads.
 *
 * The CRM must never depend on Meta being reachable: website leads keep
 * working regardless. This module only parses what Meta pushes to us and
 * hands a normalized shape to the lead service.
 */

/** Vendor-neutral shape the lead service consumes. Meta's field names stop here. */
export type ExternalLeadPayload = {
  externalId: string
  source: 'INSTAGRAM' | 'FACEBOOK'
  campaignCode: string | undefined
  fullName: string | undefined
  phone: string | undefined
  email: string | undefined
  city: string | undefined
  rawFields: Record<string, string>
  submittedAt: Date
}

type MetaFieldEntry = { name?: string; values?: string[] }

/**
 * Meta delivers answers as an unordered [{name, values}] array whose keys are
 * whatever the advertiser named the question, so lookups are by convention
 * and every field must be treated as optional.
 */
export function parseLeadgenFields(fields: MetaFieldEntry[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const field of fields) {
    if (!field.name) continue
    const value = field.values?.[0]
    if (value != null && value !== '') out[field.name.toLowerCase()] = value
  }
  return out
}

const NAME_KEYS = ['full_name', 'name', 'first_name']
const PHONE_KEYS = ['phone_number', 'phone', 'mobile']
const EMAIL_KEYS = ['email', 'email_address']
const CITY_KEYS = ['city', 'town']

function pick(fields: Record<string, string>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = fields[key]
    if (value) return value
  }
  return undefined
}

export function toExternalLead(input: {
  leadgenId: string
  platform: 'instagram' | 'facebook'
  campaignCode?: string
  fields: MetaFieldEntry[]
  createdTime?: number
}): ExternalLeadPayload {
  const rawFields = parseLeadgenFields(input.fields)
  return {
    externalId: input.leadgenId,
    source: input.platform === 'instagram' ? 'INSTAGRAM' : 'FACEBOOK',
    campaignCode: input.campaignCode,
    fullName: pick(rawFields, NAME_KEYS),
    phone: pick(rawFields, PHONE_KEYS),
    email: pick(rawFields, EMAIL_KEYS),
    city: pick(rawFields, CITY_KEYS),
    rawFields,
    submittedAt: input.createdTime ? new Date(input.createdTime * 1000) : new Date(),
  }
}

/**
 * Verifies Meta's X-Hub-Signature-256 header. An unverified webhook is an
 * open door for anyone to inject leads, so this is mandatory before parsing.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string,
): boolean {
  if (!signatureHeader?.startsWith('sha256=')) return false
  const expected = createHmac('sha256', appSecret).update(rawBody, 'utf8').digest('hex')
  const received = signatureHeader.slice('sha256='.length)
  const expectedBuffer = Buffer.from(expected, 'hex')
  const receivedBuffer = Buffer.from(received, 'hex')
  if (expectedBuffer.length !== receivedBuffer.length) return false
  return timingSafeEqual(expectedBuffer, receivedBuffer)
}

/** Meta's GET handshake when a webhook subscription is first registered. */
export function handleVerificationChallenge(
  params: URLSearchParams,
  verifyToken: string,
): { ok: true; challenge: string } | { ok: false } {
  const mode = params.get('hub.mode')
  const token = params.get('hub.verify_token')
  const challenge = params.get('hub.challenge')
  if (mode === 'subscribe' && token === verifyToken && challenge) {
    return { ok: true, challenge }
  }
  return { ok: false }
}
