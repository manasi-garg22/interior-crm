import { ActivityType, type Prisma } from '@crm/database'
import { ForbiddenError, NotFoundError, ValidationError } from '@/lib/server/errors'
import { followUpScopeFor, type SessionUser } from '@/lib/server/session'
import { insertActivity, refreshNextFollowUp } from '@/lib/modules/lead/repository'
import { bucketWindow, type Bucket } from './buckets'
import * as repository from './repository'

/**
 * Follow-up workflow.
 *
 * Every write refreshes `Lead.nextFollowUpAt`, the denormalized column the
 * leads list and dashboard sort on. Forgetting that refresh is the one way
 * this module can silently corrupt those screens, so it lives in the
 * service rather than being left to callers.
 */

export type { Bucket } from './buckets'

export function scopeFor(user: SessionUser): Prisma.FollowUpWhereInput {
  return followUpScopeFor(user) === 'all' ? {} : { assignedToId: user.id }
}

/** Translates a queue window into a Prisma filter. Boundaries live in buckets.ts. */
function bucketFilter(bucket: Bucket): Prisma.FollowUpWhereInput {
  const window = bucketWindow(bucket)

  if (!window.from && !window.to) return { status: window.status }

  return {
    status: window.status,
    scheduledAt: {
      ...(window.from ? { gte: window.from } : {}),
      ...(window.to ? { lt: window.to } : {}),
    },
  }
}

export async function listBucket(bucket: Bucket, user: SessionUser) {
  const where: Prisma.FollowUpWhereInput = {
    AND: [scopeFor(user), bucketFilter(bucket)],
  }

  const [rows, counts] = await Promise.all([
    repository.listFollowUps(where),
    repository.countByBucket(scopeFor(user)),
  ])

  const now = Date.now()

  // Overdue is derived here, not during render — reading the clock in a
  // component is impure and desynchronises server and client markup.
  return {
    rows: rows.map((row) => ({
      ...row,
      isOverdue: row.status === 'PENDING' && row.scheduledAt.getTime() < now,
    })),
    counts,
  }
}

/** A user may only act on a follow-up they can see. */
async function assertActionable(followUpId: string, user: SessionUser) {
  const followUp = await repository.findFollowUpById(followUpId)
  if (!followUp) throw new NotFoundError('Follow-up')

  if (followUpScopeFor(user) === 'own' && followUp.assignedToId !== user.id) {
    throw new ForbiddenError('That follow-up belongs to someone else.')
  }
  return followUp
}

export async function complete(
  input: { followUpId: string; outcome: string },
  user: SessionUser,
): Promise<void> {
  const followUp = await assertActionable(input.followUpId, user)

  if (followUp.status !== 'PENDING') {
    throw new ValidationError('That follow-up is already closed.')
  }

  await repository.runInTransaction(async (tx) => {
    await repository.updateFollowUp(tx, followUp.id, {
      status: 'COMPLETED',
      completedAt: new Date(),
      outcome: input.outcome,
    })

    await insertActivity(tx, {
      leadId: followUp.leadId,
      userId: user.id,
      type: ActivityType.FOLLOWUP_COMPLETED,
      title: `${followUp.type.replace(/_/g, ' ').toLowerCase()} follow-up completed`,
      description: input.outcome,
    })

    await refreshNextFollowUp(tx, followUp.leadId)
  })
}

export async function reschedule(
  input: { followUpId: string; scheduledAt: Date; notes?: string },
  user: SessionUser,
): Promise<void> {
  const followUp = await assertActionable(input.followUpId, user)

  if (followUp.status !== 'PENDING') {
    throw new ValidationError('That follow-up is already closed.')
  }

  await repository.runInTransaction(async (tx) => {
    // The original is closed as RESCHEDULED and a fresh row is created,
    // rather than moving the date in place. That keeps the history of how
    // many times a customer has been pushed back, which is exactly the
    // signal a manager wants.
    await repository.updateFollowUp(tx, followUp.id, { status: 'RESCHEDULED' })

    const replacement = await repository.createFollowUp(tx, {
      leadId: followUp.leadId,
      assignedToId: followUp.assignedToId,
      createdById: user.id,
      type: followUp.type,
      scheduledAt: input.scheduledAt,
      notes: input.notes ?? followUp.notes,
      rescheduledFromId: followUp.id,
    })

    await insertActivity(tx, {
      leadId: followUp.leadId,
      userId: user.id,
      type: ActivityType.FOLLOWUP_SCHEDULED,
      title: `Follow-up moved to ${input.scheduledAt.toLocaleDateString('en-IN')}`,
      description: input.notes ?? null,
      metadata: { from: followUp.id, to: replacement.id },
    })

    await refreshNextFollowUp(tx, followUp.leadId)
  })
}

export async function cancel(
  input: { followUpId: string; reason?: string },
  user: SessionUser,
): Promise<void> {
  const followUp = await assertActionable(input.followUpId, user)

  if (followUp.status !== 'PENDING') {
    throw new ValidationError('That follow-up is already closed.')
  }

  await repository.runInTransaction(async (tx) => {
    await repository.updateFollowUp(tx, followUp.id, {
      status: 'CANCELLED',
      outcome: input.reason ?? null,
    })

    await insertActivity(tx, {
      leadId: followUp.leadId,
      userId: user.id,
      type: ActivityType.FOLLOWUP_COMPLETED,
      title: 'Follow-up cancelled',
      description: input.reason ?? null,
    })

    await refreshNextFollowUp(tx, followUp.leadId)
  })
}
