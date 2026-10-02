import { prisma, type DocumentCategory } from '@crm/database'

export async function insertDocument(input: {
  leadId: string | null
  customerId: string | null
  projectId: string | null
  category: DocumentCategory
  fileName: string
  mimeType: string
  sizeBytes: number
  storageKey: string
  checksum: string | null
  uploadedById: string
}) {
  return prisma.document.create({ data: input })
}

/**
 * Loads a document together with the ownership facts needed to authorize
 * access, in one query — checking permission and then fetching separately
 * would be two round trips and a race.
 */
export async function findDocumentForAccess(id: string) {
  return prisma.document.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      fileName: true,
      mimeType: true,
      storageKey: true,
      leadId: true,
      customerId: true,
      lead: { select: { assignedToId: true } },
    },
  })
}

export async function softDeleteDocument(id: string): Promise<void> {
  await prisma.document.update({ where: { id }, data: { deletedAt: new Date() } })
}

export async function attachOrphanedUploads(
  storageKeys: string[],
  leadId: string,
): Promise<void> {
  if (storageKeys.length === 0) return
  await prisma.document.updateMany({
    where: { storageKey: { in: storageKeys }, leadId: null },
    data: { leadId },
  })
}
