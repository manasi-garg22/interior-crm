import { getEnv } from '@crm/config'
import { getEmailProvider } from '@crm/email'
import { logger } from '@/lib/server/logger'
import * as repository from './repository'
import type { LeadAssignedPayload, LeadCreatedPayload } from './types'

/**
 * Outbox dispatcher.
 *
 * Drains queued domain events and fans them out to notification channels.
 * Runs after the response, or from a scheduled invocation — never inside the
 * request transaction, which is the whole point of the outbox.
 *
 * Failures are recorded and retried with backoff; they never propagate back
 * to the business operation that queued the event.
 */

const log = logger.child('outbox')
const MAX_ATTEMPTS = 5
const BATCH_SIZE = 20

export async function dispatchPending(): Promise<{ processed: number; failed: number }> {
  const events = await repository.claimPendingEvents(BATCH_SIZE)

  let processed = 0
  let failed = 0

  for (const event of events) {
    try {
      await handleEvent(event.type, event.payload)
      await repository.markSent(event.id)
      processed += 1
    } catch (error) {
      failed += 1
      const attempts = event.attempts + 1
      const message = error instanceof Error ? error.message : 'Unknown error'

      if (attempts >= MAX_ATTEMPTS) {
        await repository.markFailed(event.id, attempts, message)
        log.error('event permanently failed', { type: event.type, attempts, message })
      } else {
        // Exponential backoff: 1m, 2m, 4m, 8m.
        const delayMs = 60_000 * 2 ** (attempts - 1)
        await repository.scheduleRetry(event.id, attempts, message, new Date(Date.now() + delayMs))
        log.warn('event failed, will retry', { type: event.type, attempts })
      }
    }
  }

  return { processed, failed }
}

async function handleEvent(type: string, payload: unknown): Promise<void> {
  switch (type) {
    case 'LEAD_CREATED':
      await onLeadCreated(payload as LeadCreatedPayload)
      return
    case 'LEAD_ASSIGNED':
      await onLeadAssigned(payload as LeadAssignedPayload)
      return
    default:
      // Unknown types are dropped rather than retried forever — most likely
      // an event queued by a newer deploy that this instance cannot handle.
      log.warn('no handler for event type', { type })
  }
}

async function onLeadCreated(payload: LeadCreatedPayload): Promise<void> {
  const env = getEnv()

  // 1. Dashboard notification for the owner.
  if (payload.assignedToId) {
    await repository.createNotification({
      userId: payload.assignedToId,
      type: 'LEAD_CREATED',
      title: `New ${payload.temperature.toLowerCase()} lead: ${payload.customerName}`,
      body: payload.isRepeatEnquiry
        ? 'Existing customer with a new enquiry.'
        : `Scored ${payload.score}/100.`,
      entityType: 'Lead',
      entityId: payload.leadId,
    })
  }

  // 2. Email the owner the full enquiry, if an inbox is configured.
  if (env.SALES_NOTIFICATION_EMAIL) {
    const d = payload.details
    const city = d?.city ? ` · ${d.city}` : ''
    const result = await getEmailProvider().send({
      to: env.SALES_NOTIFICATION_EMAIL,
      subject: `New ${payload.temperature} lead: ${payload.customerName}${city} (${payload.leadNumber})`,
      html: buildLeadAlertHtml(payload, `${env.NEXT_PUBLIC_APP_URL}/leads/${payload.leadId}`),
      // Hitting Reply in Gmail goes straight to the customer when they gave an email.
      ...(d?.email ? { replyTo: d.email } : {}),
    })
    // Throwing hands the event back to the outbox for a retry with backoff.
    if (!result.ok) throw new Error(`Lead alert email failed: ${result.error}`)
  }

  // 3. WhatsApp acknowledgement to the customer lands in Phase 4, once an
  //    approved template exists. The mock driver would be a no-op here, so
  //    nothing is called rather than pretending to send.
}

async function onLeadAssigned(payload: LeadAssignedPayload): Promise<void> {
  await repository.createNotification({
    userId: payload.assignedToId,
    type: 'LEAD_ASSIGNED',
    title: `Lead ${payload.leadNumber} assigned to you`,
    body: null,
    entityType: 'Lead',
    entityId: payload.leadId,
  })
}

// ── New-lead alert email ────────────────────────────────────

/** Everything here is customer input, so every value is escaped. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** "living_room" / "READY_TO_MOVE" → "Living room" / "Ready to move" */
function humanize(value: string): string {
  const spaced = value.replace(/_/g, ' ').toLowerCase()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

function buildLeadAlertHtml(payload: LeadCreatedPayload, leadUrl: string): string {
  const d = payload.details
  const row = (label: string, value: string | number | null | undefined): string =>
    value === null || value === undefined || value === ''
      ? ''
      : `<tr><td style="padding:6px 12px 6px 0;color:#6b675f;vertical-align:top;white-space:nowrap">${label}</td><td style="padding:6px 0;color:#1f1d1a">${escapeHtml(String(value))}</td></tr>`
  const section = (title: string, rows: string): string =>
    rows
      ? `<h3 style="margin:24px 0 4px;font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:#6b675f">${title}</h3><table style="border-collapse:collapse;font-size:15px">${rows}</table>`
      : ''
  const button = (href: string, text: string): string =>
    `<a href="${escapeHtml(href)}" style="display:inline-block;margin:0 8px 8px 0;padding:10px 16px;background:#1f1d1a;color:#fff;text-decoration:none;border-radius:2px;font-size:14px">${text}</a>`

  const header = `<p style="font-size:15px;margin:0 0 4px">New enquiry <strong>${escapeHtml(payload.leadNumber)}</strong> — <strong>${payload.temperature}</strong> (score ${payload.score}/100)${payload.isRepeatEnquiry ? ' · existing customer' : ''}</p>`

  // Events queued before details were added still produce a usable email.
  if (!d) {
    return `<div style="font-family:Arial,sans-serif;max-width:560px">${header}<p>${escapeHtml(payload.customerName)}</p>${button(leadUrl, 'Open in CRM')}</div>`
  }

  const whatsapp = (d.whatsappNumber ?? d.phone).replace(/\D/g, '')
  const actions = [
    button(`tel:${d.phone}`, 'Call'),
    button(`https://wa.me/${whatsapp}`, 'WhatsApp'),
    d.email ? button(`mailto:${d.email}`, 'Email') : '',
    button(leadUrl, 'Open in CRM'),
  ].join('')

  const propertyType =
    d.propertyType === 'OTHER' && d.propertyTypeOther ? d.propertyTypeOther : humanize(d.propertyType)

  const contact = [
    row('Name', payload.customerName),
    row('Phone', d.phone),
    row('WhatsApp', d.whatsappNumber && d.whatsappNumber !== d.phone ? d.whatsappNumber : null),
    row('Email', d.email),
    row('Prefers', humanize(d.preferredContact)),
  ].join('')

  const property = [
    row('Type', propertyType),
    row('Stage', humanize(d.propertyStatus)),
    row('Location', [d.locality, d.city, d.state].filter(Boolean).join(', ')),
    row('PIN code', d.pincode),
    row('Area', d.areaSqft ? `${d.areaSqft} sq ft` : null),
    row('Floors', d.floors),
    row('Possession', d.possessionDate),
  ].join('')

  const requirements = [
    row('Areas', d.spaces.map(humanize).join(', ')),
    row('Also', d.spaceOther),
    row('Styles', d.designStyles.map(humanize).join(', ')),
    row('Budget', d.budget),
    row('Timeline', d.timeline),
  ].join('')

  const notes = d.notes
    ? `<h3 style="margin:24px 0 4px;font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:#6b675f">In their words</h3><p style="margin:0;font-size:15px;white-space:pre-wrap;color:#1f1d1a">${escapeHtml(d.notes)}</p>`
    : ''

  const origin = [row('Source', humanize(d.source)), row('Campaign', d.utmCampaign)].join('')

  return `<div style="font-family:Arial,sans-serif;max-width:560px;color:#1f1d1a">
${header}
<div style="margin:16px 0 4px">${actions}</div>
${section('Contact', contact)}
${section('Property', property)}
${section('Requirements', requirements)}
${notes}
${section('Came from', origin)}
</div>`
}
