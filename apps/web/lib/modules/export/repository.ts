import { prisma } from '@crm/database'

/** Every lead received in [from, to), with everything the CSV needs. */
export function findLeadsForExport(
  range: { from: Date; to: Date },
  assignedToId: string | undefined,
) {
  return prisma.lead.findMany({
    where: {
      deletedAt: null,
      createdAt: { gte: range.from, lt: range.to },
      ...(assignedToId ? { assignedToId } : {}),
    },
    orderBy: { createdAt: 'asc' },
    take: 20_000,
    include: {
      customer: true,
      requirement: true,
      assignedTo: { select: { name: true } },
      campaign: { select: { name: true } },
    },
  })
}
