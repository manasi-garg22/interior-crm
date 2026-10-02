import type { Prisma } from '@crm/database'
import type { DomainEventPayloadMap, DomainEventType } from './types'

/**
 * Transactional outbox.
 *
 * The event row is written in the SAME transaction as the business change.
 * Either both land or neither does, so a notification can never be lost and
 * a failing integration can never roll back a customer's enquiry.
 *
 * Delivery happens afterwards, out of band, by the dispatcher.
 */

export async function enqueueEvent<T extends DomainEventType>(
  tx: Prisma.TransactionClient,
  type: T,
  payload: DomainEventPayloadMap[T],
): Promise<void> {
  await tx.outboxEvent.create({
    data: {
      type,
      payload: payload as unknown as Prisma.InputJsonValue,
    },
  })
}
