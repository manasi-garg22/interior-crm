import { ActivityType, LeadStatus } from '@crm/database'
import { NotFoundError, ValidationError } from '@/lib/server/errors'
import type { SessionUser } from '@/lib/server/session'
import { leadScopeFor } from '@/lib/server/session'
import { recordAudit } from '@/lib/server/audit'
import { enqueueEvent } from '@/lib/events/outbox'
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
  input: { leadId: string; status: LeadStatus; note?: string; lostReason?: string },
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

  await repository.runInTransaction(async (tx) => {
    await repository.updateLeadStatus(tx, lead.id, input.status, {
      lostReason: input.status === LeadStatus.LOST ? (input.lostReason ?? null) : null,
    })

    // Every status change leaves a trace — this is the audit trail the
    // pipeline view and the lead timeline both read from.
    await repository.insertActivity(tx, {
      leadId: lead.id,
      userId: user.id,
      type: ActivityType.STATUS_CHANGED,
      title: `Status changed to ${input.status.replace(/_/g, ' ').toLowerCase()}`,
      description: input.note ?? input.lostReason ?? null,
      metadata: { from: lead.status, to: input.status },
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
    after: { status: input.status },
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
      title: `Follow-up scheduled for ${input.scheduledAt.toLocaleDateString('en-IN')}`,
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
