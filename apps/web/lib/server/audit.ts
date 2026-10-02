import { headers } from 'next/headers'
import * as repository from '@/lib/modules/audit/repository'
import { clientIpFrom, hashIp } from './rate-limit'
import { logger } from './logger'

/**
 * Audit logging.
 *
 * Records who changed what, with before/after snapshots. Failures here are
 * logged but never propagate: losing an audit row is bad, but failing a
 * customer-facing write because the audit insert failed is worse.
 */

export type AuditInput = {
  actorId: string | null
  action: string
  entity: string
  entityId: string
  before?: unknown
  after?: unknown
}

export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    const requestHeaders = await headers()

    await repository.insertAuditLog({
      actorId: input.actorId,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      before: input.before ?? null,
      after: input.after ?? null,
      ip: hashIp(clientIpFrom(requestHeaders)),
      userAgent: requestHeaders.get('user-agent')?.slice(0, 500) ?? null,
    })
  } catch (error) {
    logger.error('failed to write audit log', { error, action: input.action })
  }
}
