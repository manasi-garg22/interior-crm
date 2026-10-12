import { ActivityType, type Prisma } from '@crm/database'
import { ForbiddenError, NotFoundError, ValidationError } from '@/lib/server/errors'
import { followUpScopeFor, type SessionUser } from '@/lib/server/session'
import { insertActivity, refreshNextFollowUp } from '@/lib/modules/lead/repository'
import { bucketWindow, type Bucket } from './buckets'
import { formatDateTime } from '@/lib/time'
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

export const FOLLOW_UP_PAGE_SIZE = 25

const FOLLOW_UP_TYPES = ['CALL', 'WHATSAPP', 'EMAIL', 'MEETING', 'SITE_VISIT'] as const
const TEMPERATURES = ['HOT', 'WARM', 'COLD'] as const

export type FollowUpFilters = {
  q?: string | undefined
  type?: (typeof FOLLOW_UP_TYPES)[number] | undefined
  assignedToId?: string | undefined
  temperature?: (typeof TEMPERATURES)[number] | undefined
}

/** URL values are untrusted; anything unrecognised is dropped. */
export function parseFollowUpFilters(
  params: Record<string, string | string[] | undefined>,
): FollowUpFilters {
  const get = (key: string): string | undefined => {
    const value = params[key]
    const first = Array.isArray(value) ? value[0] : value
    return first?.trim() ? first.trim().slice(0, 120) : undefined
  }
  const oneOf = <T extends string>(
    value: string | undefined,
    allowed: readonly T[],
  ): T | undefined => (allowed.includes(value as T) ? (value as T) : undefined)

  const assignedToId = get('assignedToId')

  return {
    q: get('q'),
    type: oneOf(get('type'), FOLLOW_UP_TYPES),
    temperature: oneOf(get('temperature'), TEMPERATURES),
    assignedToId:
      assignedToId && /^[a-z0-9]{20,40}$/i.test(assignedToId) ? assignedToId : undefined,
  }
}

function filterWhere(filters: FollowUpFilters, user: SessionUser): Prisma.FollowUpWhereInput {
  const conditions: Prisma.FollowUpWhereInput[] = [scopeFor(user)]

  if (filters.q) {
    const term = filters.q
    conditions.push({
      lead: {
        OR: [
          { leadNumber: { contains: term, mode: 'insensitive' } },
          { customer: { fullName: { contains: term, mode: 'insensitive' } } },
          { customer: { phone: { contains: term } } },
        ],
      },
    })
  }
  if (filters.type) conditions.push({ type: filters.type })
  if (filters.temperature) conditions.push({ lead: { temperature: filters.temperature } })
  // A scoped user is already limited to their own; the owner filter is for managers.
  if (filters.assignedToId && followUpScopeFor(user) === 'all') {
    conditions.push({ assignedToId: filters.assignedToId })
  }

  return { AND: conditions }
}

export async function listBucket(
  bucket: Bucket,
  user: SessionUser,
  filters: FollowUpFilters = {},
  page = 1,
) {
  const base = filterWhere(filters, user)
  const where: Prisma.FollowUpWhereInput = { AND: [base, bucketFilter(bucket)] }

  const [rows, total, counts] = await Promise.all([
    repository.listFollowUps(where, {
      skip: (page - 1) * FOLLOW_UP_PAGE_SIZE,
      take: FOLLOW_UP_PAGE_SIZE,
      // Open queues: oldest first, it needs attention first. Completed: newest first.
      orderBy: bucket === 'completed' ? { scheduledAt: 'desc' } : { scheduledAt: 'asc' },
    }),
    repository.countFollowUps(where),
    repository.countByBucket(base),
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
    total,
    page,
    pageSize: FOLLOW_UP_PAGE_SIZE,
    pageCount: Math.max(1, Math.ceil(total / FOLLOW_UP_PAGE_SIZE)),
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
      title: `Follow-up moved to ${formatDateTime(input.scheduledAt)}`,
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
