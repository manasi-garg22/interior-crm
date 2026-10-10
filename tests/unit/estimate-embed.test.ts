import { describe, expect, it } from 'vitest'
import { decodeEstimateFromPdf, encodeEstimate } from '../../apps/web/lib/estimate/embed'
import type { Estimate } from '../../apps/web/lib/estimate/types'

let counter = 0
const newId = () => `id-${++counter}`

/** Wraps the payload in PDF-ish bytes, the way it sits inside a real file. */
function fakePdf(payload: string): ArrayBuffer {
  const text = `%PDF-1.3\n1 0 obj\n<< /Type /Metadata >>\nstream\n<x:xmpmeta>${payload}</x:xmpmeta>\nendstream\n%%EOF`
  return new TextEncoder().encode(text).buffer as ArrayBuffer
}

const sample: Estimate = {
  clientName: 'પટેલ Villa, Gotri — ₹ quote',
  date: '2026-10-10',
  remarks: 'Kitchen first.\nThen wardrobes.',
  items: [
    { id: 'a', roomType: 'Kitchen', name: 'Base cabinets', quantity: 12, unit: 'Rft', price: 2400 },
    { id: 'b', roomType: 'Master Bedroom', name: 'Wardrobe', quantity: 48.5, unit: 'Sq.ft', price: 1350.75 },
  ],
}

describe('estimate embedded in its own PDF', () => {
  it('round-trips every field, including non-English text', () => {
    const result = decodeEstimateFromPdf(fakePdf(encodeEstimate(sample)), newId)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.estimate.clientName).toBe(sample.clientName)
    expect(result.estimate.date).toBe('2026-10-10')
    expect(result.estimate.remarks).toBe(sample.remarks)
    expect(result.estimate.items.map(({ id: _id, ...rest }) => rest)).toEqual(
      sample.items.map(({ id: _id, ...rest }) => rest),
    )
  })

  it('gives restored items fresh ids', () => {
    const result = decodeEstimateFromPdf(fakePdf(encodeEstimate(sample)), newId)
    expect(result.ok && result.estimate.items.every((item) => item.id.startsWith('id-'))).toBe(true)
  })

  it('reports PDFs made elsewhere as not ours', () => {
    expect(decodeEstimateFromPdf(fakePdf('nothing here'), newId)).toEqual({ ok: false, reason: 'not-ours' })
  })

  it('rejects tampered or malformed data', () => {
    const bad = (data: unknown) =>
      decodeEstimateFromPdf(fakePdf(`OMAEST1:${btoa(JSON.stringify(data))}:OMAEND`), newId)
    const item = { roomType: 'Kitchen', name: 'X', quantity: 1, unit: 'Nos', price: 10 }

    expect(bad({ v: 2, items: [item] }).ok).toBe(false)
    expect(bad({ v: 1, items: [{ ...item, price: -5 }] }).ok).toBe(false)
    expect(bad({ v: 1, items: [{ ...item, quantity: 'lots' }] }).ok).toBe(false)
    expect(bad({ v: 1, items: [{ ...item, name: 'x'.repeat(301) }] }).ok).toBe(false)
    expect(bad({ v: 1, items: Array.from({ length: 501 }, () => item) }).ok).toBe(false)
    expect(decodeEstimateFromPdf(fakePdf('OMAEST1:!!!!:OMAEND'), newId).ok).toBe(false)
  })
})
