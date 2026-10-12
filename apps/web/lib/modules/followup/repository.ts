import { prisma, type Prisma } from '@crm/database'
import { startOfBusinessDay, startOfNextBusinessDay } from '@/lib/time'

/**
 * Follow-up data access.
 *
 * The queue queries all sort ascending by `scheduledAt` — the oldest
 * overdue item is the one that needs attention first, not the newest.
 */

export const FOLLOW_UP_INCLUDE = {
  lead: {
    select: {
      id: true,
      leadNumber: true,
      status: true,
      temperature: true,
      customer: { select: { id: true, fullName: true, phone: true, city: true } },
    },
  },
  assignedTo: { select: { id: true, name: true } },
} satisfies Prisma.FollowUpInclude

export type FollowUpRow = Prisma.FollowUpGetPayload<{ include: typeof FOLLOW_UP_INCLUDE }>

export async function listFollowUps(
  where: Prisma.FollowUpWhereInput,
  options: { skip?: number; take?: number; orderBy?: Prisma.FollowUpOrderByWithRelationInput } = {},
): Promise<FollowUpRow[]> {
  return prisma.followUp.findMany({
    where,
    orderBy: options.orderBy ?? { scheduledAt: 'asc' },
    skip: options.skip ?? 0,
    take: options.take ?? 200,
    include: FOLLOW_UP_INCLUDE,
  })
}

export async function countFollowUps(where: Prisma.FollowUpWhereInput): Promise<number> {
  return prisma.followUp.count({ where })
}

export async function findFollowUpById(id: string): Promise<FollowUpRow | null> {
  return prisma.followUp.findUnique({ where: { id }, include: FOLLOW_UP_INCLUDE })
}

export function runInTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(fn, { timeout: 30_000, maxWait: 10_000 })
}

export async function updateFollowUp(
  tx: Prisma.TransactionClient,
  id: string,
  data: Prisma.FollowUpUpdateInput,
): Promise<void> {
  await tx.followUp.update({ where: { id }, data })
}

export async function createFollowUp(
  tx: Prisma.TransactionClient,
  data: Prisma.FollowUpUncheckedCreateInput,
): Promise<{ id: string }> {
  return tx.followUp.create({ data, select: { id: true } })
}

export async function countByBucket(
  scope: Prisma.FollowUpWhereInput,
): Promise<{ overdue: number; today: number; upcoming: number; completed: number }> {
  const now = new Date()
  // IST day boundaries; the server's own clock is UTC.
  const startOfToday = startOfBusinessDay(now)
  const startOfTomorrow = startOfNextBusinessDay(now)

  const [overdue, today, upcoming, completed] = await prisma.$transaction([
    prisma.followUp.count({
      where: { AND: [scope, { status: 'PENDING', scheduledAt: { lt: startOfToday } }] },
    }),
    prisma.followUp.count({
      where: {
        AND: [
          scope,
          { status: 'PENDING', scheduledAt: { gte: startOfToday, lt: startOfTomorrow } },
        ],
      },
    }),
    prisma.followUp.count({
      where: { AND: [scope, { status: 'PENDING', scheduledAt: { gte: startOfTomorrow } }] },
    }),
    prisma.followUp.count({ where: { AND: [scope, { status: 'COMPLETED' }] } }),
  ])

  return { overdue, today, upcoming, completed }
}
