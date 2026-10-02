import { prisma, OutboxStatus } from '@crm/database'

/**
 * Outbox persistence.
 *
 * `claimPendingEvents` flips rows to PROCESSING before returning them, so
 * two concurrent dispatcher runs cannot deliver the same notification twice.
 */

export async function claimPendingEvents(limit: number) {
  const candidates = await prisma.outboxEvent.findMany({
    where: { status: OutboxStatus.PENDING, availableAt: { lte: new Date() } },
    orderBy: { createdAt: 'asc' },
    take: limit,
    select: { id: true },
  })

  if (candidates.length === 0) return []

  const ids = candidates.map((row) => row.id)

  // Conditional on still being PENDING: whichever runner updates first wins,
  // and the other sees zero rows.
  const claimed = await prisma.outboxEvent.updateMany({
    where: { id: { in: ids }, status: OutboxStatus.PENDING },
    data: { status: OutboxStatus.PROCESSING },
  })

  if (claimed.count === 0) return []

  return prisma.outboxEvent.findMany({
    where: { id: { in: ids }, status: OutboxStatus.PROCESSING },
    orderBy: { createdAt: 'asc' },
  })
}

export async function markSent(id: string): Promise<void> {
  await prisma.outboxEvent.update({
    where: { id },
    data: { status: OutboxStatus.SENT, processedAt: new Date() },
  })
}

export async function scheduleRetry(
  id: string,
  attempts: number,
  lastError: string,
  availableAt: Date,
): Promise<void> {
  await prisma.outboxEvent.update({
    where: { id },
    data: { status: OutboxStatus.PENDING, attempts, lastError, availableAt },
  })
}

export async function markFailed(
  id: string,
  attempts: number,
  lastError: string,
): Promise<void> {
  await prisma.outboxEvent.update({
    where: { id },
    data: { status: OutboxStatus.FAILED, attempts, lastError, processedAt: new Date() },
  })
}

export async function createNotification(input: {
  userId: string
  type: string
  title: string
  body: string | null
  entityType: string
  entityId: string
}): Promise<void> {
  await prisma.notification.create({ data: input })
}
