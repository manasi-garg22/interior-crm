import { ActivityType, LeadStatus } from '@crm/database'
import { formatInr } from '@/lib/estimate/types'
import { NotFoundError, ValidationError } from '@/lib/server/errors'
import type { SessionUser } from '@/lib/server/session'
import { leadScopeFor } from '@/lib/server/session'
import { recordAudit } from '@/lib/server/audit'
import { enqueueEvent } from '@/lib/events/outbox'
import { formatDateTime } from '@/lib/time'
import * as repository from './repository'

/**
 * Lead mutations.
 *
 * Every one of these re-checks that the caller can reach the lead at all:
 * an executive must not be able to change the status of someone else's lead
 * by posting its id directly, even though the UI would never offer it.
 */

async function assertVisible(leadId: string, user: SessionUser) {
  const scope = leadScopeFor(user) === 'all' ? {} : { assignedToId: user.id }
  const lead = await repository.findLeadById(leadId, scope)
  if (!lead) throw new NotFoundError('Lead')
  return lead
}

export async function changeStatus(
  input: {
    leadId: string
    status: LeadStatus
    note?: string
    lostReason?: string
    wonValue?: number
  },
  user: SessionUser,
): Promise<void> {
  const lead = await assertVisible(input.leadId, user)

  if (lead.status === input.status) {
    throw new ValidationError('That lead is already at this stage.')
  }
  if (input.status === LeadStatus.LOST && !input.lostReason) {
    throw new ValidationError('Record why this lead was lost', {
      lostReason: ['Required when marking a lead lost'],
    })
  }

  // The won value is locked once set. A lead re-won after being reopened
  // keeps its original amount; only an admin can change it, separately.
  const lockedValue = lead.wonValue != null ? Number(lead.wonValue) : null
  const settingWonValue = input.status === LeadStatus.WON && lockedValue == null
  if (settingWonValue && input.wonValue == null) {
    throw new ValidationError('Enter the final deal amount to mark this lead won', {
      wonValue: ['Required when marking a lead won'],
    })
  }
  const wonValue = settingWonValue ? input.wonValue! : null

  await repository.runInTransaction(async (tx) => {
    await repository.updateLeadStatus(tx, lead.id, input.status, {
      lostReason: input.status === LeadStatus.LOST ? (input.lostReason ?? null) : null,
      ...(wonValue != null
        ? { wonValue, wonValueSetAt: new Date(), wonValueSetById: user.id }
        : {}),
    })

    // Every status change leaves a trace — this is the audit trail the
    // pipeline view and the lead timeline both read from.
    await repository.insertActivity(tx, {
      leadId: lead.id,
      userId: user.id,
      type: ActivityType.STATUS_CHANGED,
      title:
        input.status === LeadStatus.WON
          ? `Won · ${formatInr(wonValue ?? lockedValue ?? 0)}${wonValue != null ? ' (locked)' : ''}`
          : `Status changed to ${input.status.replace(/_/g, ' ').toLowerCase()}`,
      description: input.note ?? input.lostReason ?? null,
      metadata: {
        from: lead.status,
        to: input.status,
        ...(wonValue != null ? { wonValue } : {}),
      },
    })

    await enqueueEvent(tx, 'LEAD_STATUS_CHANGED', {
      leadId: lead.id,
      leadNumber: lead.leadNumber,
      fromStatus: lead.status,
      toStatus: input.status,
      changedById: user.id,
      assignedToId: lead.assignedToId,
    })
  })

  await recordAudit({
    actorId: user.id,
    action: 'lead.status_changed',
    entity: 'Lead',
    entityId: lead.id,
    before: { status: lead.status },
    after: { status: input.status, ...(wonValue != null ? { wonValue } : {}) },
  })
}

/**
 * Corrects a locked won value. The action layer restricts this to
 * `lead:won_value:edit` (admins); the reason is required and both the
 * timeline and the audit log keep the old and new amounts.
 */
export async function updateWonValue(
  input: { leadId: string; wonValue: number; reason: string },
  user: SessionUser,
): Promise<void> {
  const lead = await assertVisible(input.leadId, user)

  const previous = lead.wonValue != null ? Number(lead.wonValue) : null
  if (lead.status !== LeadStatus.WON && previous == null) {
    throw new ValidationError('Only a won lead has a deal value.')
  }
  if (previous === input.wonValue) {
    throw new ValidationError('That is already the deal value.')
  }

  await repository.runInTransaction(async (tx) => {
    await tx.lead.update({
      where: { id: lead.id },
      data: { wonValue: input.wonValue, wonValueSetAt: new Date(), wonValueSetById: user.id },
    })

    await repository.insertActivity(tx, {
      leadId: lead.id,
      userId: user.id,
      type: ActivityType.STATUS_CHANGED,
      title:
        previous == null
          ? `Deal value set to ${formatInr(input.wonValue)}`
          : `Deal value changed from ${formatInr(previous)} to ${formatInr(input.wonValue)}`,
      description: input.reason,
      metadata: { wonValueFrom: previous, wonValueTo: input.wonValue },
    })
  })

  await recordAudit({
    actorId: user.id,
    action: 'lead.won_value_changed',
    entity: 'Lead',
    entityId: lead.id,
    before: { wonValue: previous },
    after: { wonValue: input.wonValue, reason: input.reason },
  })
}

export async function assignTo(
  input: { leadId: string; assignedToId: string | null; note?: string },
  user: SessionUser,
): Promise<void> {
  const lead = await assertVisible(input.leadId, user)

  await repository.runInTransaction(async (tx) => {
    await repository.assignLead(tx, lead.id, input.assignedToId)

    await repository.insertActivity(tx, {
      leadId: lead.id,
      userId: user.id,
      type: ActivityType.ASSIGNED,
      title: input.assignedToId ? 'Lead reassigned' : 'Lead unassigned',
      description: input.note ?? null,
      metadata: { from: lead.assignedToId, to: input.assignedToId },
    })

    if (input.assignedToId) {
      await enqueueEvent(tx, 'LEAD_ASSIGNED', {
        leadId: lead.id,
        leadNumber: lead.leadNumber,
        assignedToId: input.assignedToId,
        assignedById: user.id,
      })
    }
  })

  await recordAudit({
    actorId: user.id,
    action: 'lead.assigned',
    entity: 'Lead',
    entityId: lead.id,
    before: { assignedToId: lead.assignedToId },
    after: { assignedToId: input.assignedToId },
  })
}

export async function addNote(
  input: { leadId: string; note: string },
  user: SessionUser,
): Promise<void> {
  const lead = await assertVisible(input.leadId, user)

  await repository.runInTransaction(async (tx) => {
    await repository.insertActivity(tx, {
      leadId: lead.id,
      userId: user.id,
      type: ActivityType.NOTE_ADDED,
      title: 'Note added',
      description: input.note,
    })
  })
}

export async function scheduleFollowUp(
  input: {
    leadId: string
    assignedToId: string
    type: 'CALL' | 'WHATSAPP' | 'EMAIL' | 'MEETING' | 'SITE_VISIT'
    scheduledAt: Date
    notes?: string
  },
  user: SessionUser,
): Promise<void> {
  const lead = await assertVisible(input.leadId, user)

  await repository.runInTransaction(async (tx) => {
    const followUp = await tx.followUp.create({
      data: {
        leadId: lead.id,
        assignedToId: input.assignedToId,
        createdById: user.id,
        type: input.type,
        scheduledAt: input.scheduledAt,
        notes: input.notes ?? null,
      },
    })

    await repository.insertActivity(tx, {
      leadId: lead.id,
      userId: user.id,
      type: ActivityType.FOLLOWUP_SCHEDULED,
      title: `Follow-up scheduled for ${formatDateTime(input.scheduledAt)}`,
      description: input.notes ?? null,
    })

    // Keeps Lead.nextFollowUpAt honest for the list and dashboard queries.
    await repository.refreshNextFollowUp(tx, lead.id)

    await enqueueEvent(tx, 'FOLLOWUP_SCHEDULED', {
      followUpId: followUp.id,
      leadId: lead.id,
      assignedToId: input.assignedToId,
      scheduledAt: input.scheduledAt.toISOString(),
    })
  })
}

export async function getLeadDetail(leadId: string, user: SessionUser) {
  return assertVisible(leadId, user)
}
