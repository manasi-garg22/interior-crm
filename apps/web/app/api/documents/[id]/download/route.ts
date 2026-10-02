import { NextResponse } from 'next/server'
import { openDocument } from '@/lib/modules/document/service'
import { requireUserOrThrow } from '@/lib/server/session'
import { toUserFacingError } from '@/lib/server/errors'

/**
 * Authenticated document download.
 *
 * The permission check happens before any URL is minted or byte is read, so
 * an unauthorized caller never receives either.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const user = await requireUserOrThrow()
    const { id } = await context.params

    const target = await openDocument(id, user)

    if (target.kind === 'redirect') {
      const response = NextResponse.redirect(new URL(target.url, request.url), 302)
      // A presigned URL must never be cached by a shared proxy.
      response.headers.set('Cache-Control', 'private, no-store')
      return response
    }

    return new NextResponse(new Uint8Array(target.bytes), {
      status: 200,
      headers: {
        'Content-Type': target.mimeType,
        // `attachment` and nosniff together stop an uploaded SVG or HTML
        // file from executing script in our own origin.
        'Content-Disposition': `attachment; filename="${encodeURIComponent(target.fileName)}"`,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, no-store',
      },
    }) as NextResponse
  } catch (error) {
    const exposed = toUserFacingError(error)
    return NextResponse.json({ error: exposed.message }, { status: exposed.status })
  }
}
