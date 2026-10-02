import { prisma, type Prisma } from '@crm/database'

export async function insertAuditLog(input: {
  actorId: string | null
  action: string
  entity: string
  entityId: string
  before: unknown
  after: unknown
  ip: string | null
  userAgent: string | null
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorId: input.actorId,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      before: (input.before ?? undefined) as Prisma.InputJsonValue | undefined,
      after: (input.after ?? undefined) as Prisma.InputJsonValue | undefined,
      ip: input.ip,
      userAgent: input.userAgent,
    },
  })
}

export async function listAuditLogs(entity: string, entityId: string, take = 100) {
  return prisma.auditLog.findMany({
    where: { entity, entityId },
    orderBy: { createdAt: 'desc' },
    take,
    include: { actor: { select: { id: true, name: true } } },
  })
}
