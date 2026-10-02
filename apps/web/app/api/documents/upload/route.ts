import { NextResponse } from 'next/server'
import { uploadLeadDocument } from '@/lib/modules/document/service'
import { requireUserOrThrow } from '@/lib/server/session'
import { toUserFacingError } from '@/lib/server/errors'
import { logger } from '@/lib/server/logger'
import type { DocumentCategory } from '@crm/database'

const log = logger.child('api.documents.upload')

const CATEGORIES = [
  'FLOOR_PLAN',
  'PROPERTY_PHOTO',
  'INSPIRATION',
  'EXISTING_DESIGN',
  'QUOTATION',
  'CONTRACT',
  'OTHER',
]

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const user = await requireUserOrThrow()

    const form = await request.formData().catch(() => null)
    if (!form) return NextResponse.json({ error: 'Invalid upload.' }, { status: 400 })

    const file = form.get('file')
    const leadId = form.get('leadId')
    const rawCategory = String(form.get('category') ?? 'OTHER')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 })
    }
    if (typeof leadId !== 'string' || !leadId) {
      return NextResponse.json({ error: 'Missing lead reference.' }, { status: 400 })
    }

    const category = (
      CATEGORIES.includes(rawCategory) ? rawCategory : 'OTHER'
    ) as DocumentCategory

    const document = await uploadLeadDocument(
      {
        leadId,
        category,
        fileName: file.name,
        mimeType: file.type,
        bytes: Buffer.from(await file.arrayBuffer()),
      },
      user,
    )

    return NextResponse.json(
      {
        id: document.id,
        fileName: document.fileName,
        sizeBytes: document.sizeBytes,
        category: document.category,
      },
      { status: 201 },
    )
  } catch (error) {
    const exposed = toUserFacingError(error)
    if (exposed.status >= 500) log.error('document upload failed', { error })
    return NextResponse.json({ error: exposed.message }, { status: exposed.status })
  }
}
