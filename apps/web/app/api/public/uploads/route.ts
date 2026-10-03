import { NextResponse } from 'next/server'
import {
  ALLOWED_UPLOAD_MIME_TYPES,
  UPLOAD_EXTENSION_BY_MIME,
  getEnv,
  getPublicEnv,
  type AllowedUploadMimeType,
} from '@crm/config'
import { buildStorageKey, getFileStorage } from '@crm/storage'
import { clientIpFrom, getRateLimiter, hashIp } from '@/lib/server/rate-limit'
import { logger } from '@/lib/server/logger'

export const dynamic = 'force-dynamic'

/**
 * Attachment upload for the public enquiry form.
 *
 * Files land in object storage under an unguessable key before the lead
 * exists; the submission then references the returned keys. Orphaned uploads
 * from abandoned forms are swept separately.
 *
 * Every limit here is enforced server-side. The `accept` attribute and any
 * client-side size check are conveniences, not controls.
 */

const log = logger.child('api.public.uploads')

export async function POST(request: Request): Promise<NextResponse> {
  if (!getPublicEnv().uploadsEnabled) {
    return NextResponse.json({ error: 'File uploads are not available yet.' }, { status: 503 })
  }

  const env = getEnv()
  const ipHash = hashIp(clientIpFrom(request.headers))

  // Uploads are far more expensive than a form POST, so they get their own,
  // tighter budget.
  const limit = await getRateLimiter().check(`public-upload:${ipHash}`, 30, 3600)
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many uploads. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
    )
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid upload.' }, { status: 400 })
  }

  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided.' }, { status: 400 })
  }

  const maxBytes = env.MAX_UPLOAD_MB * 1024 * 1024
  if (file.size === 0) {
    return NextResponse.json({ error: 'That file is empty.' }, { status: 400 })
  }
  if (file.size > maxBytes) {
    return NextResponse.json(
      { error: `Files must be under ${env.MAX_UPLOAD_MB} MB.` },
      { status: 400 },
    )
  }

  const mimeType = file.type
  if (!isAllowedMime(mimeType)) {
    return NextResponse.json(
      { error: 'Only JPG, PNG, WEBP, HEIC and PDF files are accepted.' },
      { status: 400 },
    )
  }

  const bytes = Buffer.from(await file.arrayBuffer())

  // The browser-declared type is a hint, not evidence. Check the magic bytes
  // so a renamed executable cannot be stored as an "image".
  if (!matchesMagicBytes(bytes, mimeType)) {
    log.warn('upload rejected: content did not match declared type', { mimeType })
    return NextResponse.json({ error: 'That file appears to be corrupted.' }, { status: 400 })
  }

  try {
    const key = buildStorageKey('public-enquiry', ipHash, UPLOAD_EXTENSION_BY_MIME[mimeType])
    const stored = await getFileStorage().put(key, bytes, mimeType)

    return NextResponse.json(
      {
        storageKey: stored.key,
        // Never echo the client's filename into a header or path; it is only
        // stored as a display label.
        fileName: sanitizeFileName(file.name),
        mimeType,
        sizeBytes: stored.sizeBytes,
      },
      { status: 201 },
    )
  } catch (error) {
    log.error('upload failed', { error })
    return NextResponse.json({ error: 'Could not store that file.' }, { status: 500 })
  }
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

/** Minimal signature check for the formats we accept. */
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
      // "RIFF" .... "WEBP"
      return startsWith(0x52, 0x49, 0x46, 0x46) && bytes.subarray(8, 12).toString() === 'WEBP'
    case 'image/heic':
      // ISO-BMFF: bytes 4..8 are "ftyp".
      return bytes.subarray(4, 8).toString() === 'ftyp'
    default:
      return false
  }
}
