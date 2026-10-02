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

  // 2. Email the sales inbox, if one is configured.
  if (env.SALES_NOTIFICATION_EMAIL) {
    await getEmailProvider().send({
      to: env.SALES_NOTIFICATION_EMAIL,
      subject: `New lead ${payload.leadNumber} — ${payload.customerName}`,
      html: `<p>A new enquiry has arrived.</p>
<ul>
  <li>Reference: ${payload.leadNumber}</li>
  <li>Temperature: ${payload.temperature} (score ${payload.score})</li>
  <li>${payload.isRepeatEnquiry ? 'Existing customer, new enquiry' : 'New customer'}</li>
</ul>
<p><a href="${env.NEXT_PUBLIC_APP_URL}/leads/${payload.leadId}">Open in the CRM</a></p>`,
    })
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
