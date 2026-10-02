import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  parseLeadgenFields,
  toExternalLead,
  verifyWebhookSignature,
  handleVerificationChallenge,
} from '@crm/meta'

describe('Meta lead-ads field parsing', () => {
  it('flattens Meta’s name/values array into a lookup', () => {
    const fields = parseLeadgenFields([
      { name: 'full_name', values: ['Priya Sharma'] },
      { name: 'phone_number', values: ['+919876543210'] },
    ])
    expect(fields).toEqual({ full_name: 'Priya Sharma', phone_number: '+919876543210' })
  })

  it('ignores entries with no name or no value instead of throwing', () => {
    const fields = parseLeadgenFields([
      { name: 'email', values: [] },
      { values: ['orphan'] },
      { name: 'city', values: ['Pune'] },
    ])
    expect(fields).toEqual({ city: 'Pune' })
  })

  it('normalizes a leadgen payload and tolerates every field being absent', () => {
    const lead = toExternalLead({ leadgenId: 'lg_1', platform: 'instagram', fields: [] })
    expect(lead.source).toBe('INSTAGRAM')
    expect(lead.fullName).toBeUndefined()
    expect(lead.phone).toBeUndefined()
    expect(lead.submittedAt).toBeInstanceOf(Date)
  })

  it('accepts alternate advertiser field names', () => {
    const lead = toExternalLead({
      leadgenId: 'lg_2',
      platform: 'facebook',
      fields: [
        { name: 'Mobile', values: ['9876543210'] },
        { name: 'email_address', values: ['a@b.com'] },
      ],
    })
    expect(lead.source).toBe('FACEBOOK')
    expect(lead.phone).toBe('9876543210')
    expect(lead.email).toBe('a@b.com')
  })
})

describe('Meta webhook signature verification', () => {
  const secret = 'app-secret'
  const body = JSON.stringify({ object: 'page' })
  const valid = 'sha256=' + createHmac('sha256', secret).update(body, 'utf8').digest('hex')

  it('accepts a correctly signed body', () => {
    expect(verifyWebhookSignature(body, valid, secret)).toBe(true)
  })

  it('rejects a tampered body', () => {
    expect(verifyWebhookSignature(body + ' ', valid, secret)).toBe(false)
  })

  it('rejects a missing or malformed header', () => {
    expect(verifyWebhookSignature(body, null, secret)).toBe(false)
    expect(verifyWebhookSignature(body, 'sha1=abc', secret)).toBe(false)
  })

  it('rejects a signature of the wrong length without throwing', () => {
    expect(verifyWebhookSignature(body, 'sha256=abcd', secret)).toBe(false)
  })
})

describe('Meta subscription handshake', () => {
  it('echoes the challenge when mode and token match', () => {
    const params = new URLSearchParams({
      'hub.mode': 'subscribe',
      'hub.verify_token': 'secret-token',
      'hub.challenge': '12345',
    })
    expect(handleVerificationChallenge(params, 'secret-token')).toEqual({
      ok: true,
      challenge: '12345',
    })
  })

  it('refuses a wrong verify token', () => {
    const params = new URLSearchParams({
      'hub.mode': 'subscribe',
      'hub.verify_token': 'wrong',
      'hub.challenge': '12345',
    })
    expect(handleVerificationChallenge(params, 'secret-token')).toEqual({ ok: false })
  })
})
