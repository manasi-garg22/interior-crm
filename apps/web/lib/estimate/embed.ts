/**
 * Round-tripping an estimate through its own PDF.
 *
 * Every PDF the builder produces carries a copy of the estimate data in its
 * XMP metadata, wrapped in markers. Uploading that PDF later restores the
 * items exactly — no fragile reading of text back out of the page.
 *
 * Uploaded files are untrusted: the payload is size-limited and validated
 * field by field before anything reaches the builder.
 */

import type { Estimate, EstimateItem } from './types'

export const EMBED_NAMESPACE = 'https://www.omarchdesigns.com/ns/estimate/1.0/'

const START = 'OMAEST1:'
const END = ':OMAEND'
const PAYLOAD = /OMAEST1:([A-Za-z0-9+/=]{4,2000000}):OMAEND/

const MAX_ITEMS = 500
const MAX_TEXT = 300
const MAX_REMARKS = 5000
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024

function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function fromBase64(base64: string): string {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

/** Text to place in the PDF's metadata. Base64 needs no XML or PDF escaping. */
export function encodeEstimate(estimate: Estimate): string {
  const data = {
    v: 1,
    clientName: estimate.clientName,
    date: estimate.date,
    remarks: estimate.remarks,
    items: estimate.items.map(({ roomType, name, quantity, unit, price }) => ({
      roomType,
      name,
      quantity,
      unit,
      price,
    })),
  }
  return `${START}${toBase64(JSON.stringify(data))}${END}`
}

export type DecodeResult =
  | { ok: true; estimate: Estimate }
  | { ok: false; reason: 'not-ours' | 'invalid' }

function text(value: unknown, max: number): string | null {
  return typeof value === 'string' && value.length <= max ? value : null
}

function finiteNumber(value: unknown, min: number): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value < 1e12 ? value : null
}

/**
 * Reads the estimate back out of PDF bytes. `newId` supplies fresh item ids,
 * so uploaded items never collide with anything already on screen.
 */
export function decodeEstimateFromPdf(bytes: ArrayBuffer, newId: () => string): DecodeResult {
  // latin1 maps every byte to one character, so the ASCII markers survive intact.
  const raw = new TextDecoder('latin1').decode(bytes)
  const match = PAYLOAD.exec(raw)
  if (!match?.[1]) return { ok: false, reason: 'not-ours' }

  let data: unknown
  try {
    data = JSON.parse(fromBase64(match[1]))
  } catch {
    return { ok: false, reason: 'invalid' }
  }
  if (typeof data !== 'object' || data === null) return { ok: false, reason: 'invalid' }
  const record = data as Record<string, unknown>
  if (record.v !== 1 || !Array.isArray(record.items) || record.items.length > MAX_ITEMS) {
    return { ok: false, reason: 'invalid' }
  }

  const items: EstimateItem[] = []
  for (const entry of record.items) {
    if (typeof entry !== 'object' || entry === null) return { ok: false, reason: 'invalid' }
    const item = entry as Record<string, unknown>
    const roomType = text(item.roomType, MAX_TEXT)
    const name = text(item.name, MAX_TEXT)
    const unit = text(item.unit, MAX_TEXT)
    const quantity = finiteNumber(item.quantity, 0)
    const price = finiteNumber(item.price, 0)
    if (!roomType || !name || !unit || quantity === null || price === null) {
      return { ok: false, reason: 'invalid' }
    }
    items.push({ id: newId(), roomType, name, unit, quantity, price })
  }

  const date = text(record.date, 10) ?? ''
  return {
    ok: true,
    estimate: {
      clientName: text(record.clientName, MAX_TEXT) ?? '',
      date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : '',
      remarks: text(record.remarks, MAX_REMARKS) ?? '',
      items,
    },
  }
}
