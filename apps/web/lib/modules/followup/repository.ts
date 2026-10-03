import { prisma, type Prisma } from '@crm/database'

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
  take = 200,
): Promise<FollowUpRow[]> {
  return prisma.followUp.findMany({
    where,
    orderBy: { scheduledAt: 'asc' },
    take,
    include: FOLLOW_UP_INCLUDE,
  })
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
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfTomorrow = new Date(startOfToday.getTime() + 86_400_000)

  const [overdue, today, upcoming, completed] = await prisma.$transaction([
    prisma.followUp.count({
      where: { AND: [scope, { status: 'PENDING', scheduledAt: { lt: startOfToday } }] },
    }),
    prisma.followUp.count({
      where: {
        AND: [scope, { status: 'PENDING', scheduledAt: { gte: startOfToday, lt: startOfTomorrow } }],
      },
    }),
    prisma.followUp.count({
      where: { AND: [scope, { status: 'PENDING', scheduledAt: { gte: startOfTomorrow } }] },
    }),
    prisma.followUp.count({ where: { AND: [scope, { status: 'COMPLETED' }] } }),
  ])

  return { overdue, today, upcoming, completed }
}
