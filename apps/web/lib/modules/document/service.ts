import {
  ALLOWED_UPLOAD_MIME_TYPES,
  UPLOAD_EXTENSION_BY_MIME,
  can,
  getEnv,
  type AllowedUploadMimeType,
  type Role,
} from '@crm/config'
import { buildStorageKey, getFileStorage } from '@crm/storage'
import { ActivityType, type DocumentCategory } from '@crm/database'
import { AppError, ForbiddenError, NotFoundError } from '@/lib/server/errors'
import { leadScopeFor, type SessionUser } from '@/lib/server/session'
import { findLeadById, insertActivity, runInTransaction } from '@/lib/modules/lead/repository'
import * as repository from './repository'

/**
 * Document handling for authenticated CRM users.
 *
 * Validation is identical to the public upload route and deliberately
 * duplicated rather than shared-by-accident: these are two different trust
 * boundaries, and weakening one must not silently weaken the other.
 */

export type UploadInput = {
  leadId: string
  category: DocumentCategory
  fileName: string
  mimeType: string
  bytes: Buffer
}

export async function uploadLeadDocument(input: UploadInput, user: SessionUser) {
  const env = getEnv()

  if (!can(user.role as Role, 'document:upload')) {
    throw new ForbiddenError('You cannot upload documents.')
  }

  if (!isAllowedMime(input.mimeType)) {
    throw new AppError('UPLOAD_REJECTED', 'Only JPG, PNG, WEBP, HEIC and PDF files are accepted.')
  }

  const maxBytes = env.MAX_UPLOAD_MB * 1024 * 1024
  if (input.bytes.byteLength === 0) {
    throw new AppError('UPLOAD_REJECTED', 'That file is empty.')
  }
  if (input.bytes.byteLength > maxBytes) {
    throw new AppError('UPLOAD_REJECTED', `Files must be under ${env.MAX_UPLOAD_MB} MB.`)
  }
  if (!matchesMagicBytes(input.bytes, input.mimeType)) {
    throw new AppError('UPLOAD_REJECTED', 'That file appears to be corrupted.')
  }

  // Confirms the uploader can actually reach this lead before anything is
  // written to storage.
  const lead = await assertLeadVisible(input.leadId, user)

  const key = buildStorageKey('lead', lead.id, UPLOAD_EXTENSION_BY_MIME[input.mimeType])
  const stored = await getFileStorage().put(key, input.bytes, input.mimeType)

  const document = await repository.insertDocument({
    leadId: lead.id,
    customerId: lead.customerId,
    projectId: null,
    category: input.category,
    fileName: sanitizeFileName(input.fileName),
    mimeType: input.mimeType,
    sizeBytes: stored.sizeBytes,
    storageKey: stored.key,
    checksum: stored.checksum,
    uploadedById: user.id,
  })

  await runInTransaction(async (tx) => {
    await insertActivity(tx, {
      leadId: lead.id,
      userId: user.id,
      type: ActivityType.DOCUMENT_UPLOADED,
      title: `Uploaded ${document.fileName}`,
    })
  })

  return document
}

export type DownloadTarget =
  /** S3-compatible storage can serve the bytes itself, briefly. */
  | { kind: 'redirect'; url: string; fileName: string }
  /**
   * The local dev driver has no way to sign a URL, so the app streams the
   * bytes instead. Handing out an unauthenticated local path would put every
   * uploaded floor plan behind nothing but an unguessable filename.
   */
  | { kind: 'stream'; bytes: Buffer; mimeType: string; fileName: string }

/**
 * Resolves a document to something downloadable, but only after
 * re-checking that this user may see the lead it hangs off. Storage keys
 * are random and therefore unguessable — but "unguessable" is not access
 * control.
 */
export async function openDocument(
  documentId: string,
  user: SessionUser,
): Promise<DownloadTarget> {
  if (!can(user.role as Role, 'document:read')) {
    throw new ForbiddenError('You cannot view documents.')
  }

  const document = await repository.findDocumentForAccess(documentId)
  if (!document) throw new NotFoundError('Document')

  if (leadScopeFor(user) === 'assigned' && document.lead?.assignedToId !== user.id) {
    // Same error as a missing document — telling them it exists but is not
    // theirs would leak the existence of other people's leads.
    throw new NotFoundError('Document')
  }

  const storage = getFileStorage()

  if (storage.driver === 'local') {
    return {
      kind: 'stream',
      bytes: await storage.get(document.storageKey),
      mimeType: document.mimeType,
      fileName: document.fileName,
    }
  }

  return {
    kind: 'redirect',
    url: await storage.presignDownload(document.storageKey, 120),
    fileName: document.fileName,
  }
}

export async function deleteDocument(documentId: string, user: SessionUser): Promise<void> {
  if (!can(user.role as Role, 'document:delete')) {
    throw new ForbiddenError('You cannot delete documents.')
  }

  const document = await repository.findDocumentForAccess(documentId)
  if (!document) throw new NotFoundError('Document')

  // Soft delete only. The object stays in storage so an accidental removal
  // is recoverable; a scheduled sweep handles permanent deletion.
  await repository.softDeleteDocument(documentId)
}

async function assertLeadVisible(leadId: string, user: SessionUser) {
  const scope = leadScopeFor(user) === 'all' ? {} : { assignedToId: user.id }

  const lead = await findLeadById(leadId, scope)
  if (!lead) throw new NotFoundError('Lead')
  return lead
}

function isAllowedMime(value: string): value is AllowedUploadMimeType {
  return (ALLOWED_UPLOAD_MIME_TYPES as readonly string[]).includes(value)
}

function sanitizeFileName(name: string): string {
  return (
    name
      .replace(/[\\/]/g, '_')
      .replace(/[\u0000-\u001f\u007f]/g, '')
      .trim()
      .slice(0, 255) || 'attachment'
  )
}

function matchesMagicBytes(bytes: Buffer, mimeType: AllowedUploadMimeType): boolean {
  const startsWith = (...signature: number[]): boolean =>
    signature.every((byte, index) => bytes[index] === byte)

  switch (mimeType) {
    case 'image/jpeg':
      return startsWith(0xff, 0xd8, 0xff)
    case 'image/png':
      return startsWith(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)
    case 'application/pdf':
      return startsWith(0x25, 0x50, 0x44, 0x46)
    case 'image/webp':
      return startsWith(0x52, 0x49, 0x46, 0x46) && bytes.subarray(8, 12).toString() === 'WEBP'
    case 'image/heic':
      return bytes.subarray(4, 8).toString() === 'ftyp'
    default:
      return false
  }
}
