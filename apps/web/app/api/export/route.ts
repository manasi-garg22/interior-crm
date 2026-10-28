import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/server/session'
import { toUserFacingError } from '@/lib/server/errors'
import { exportLeadsCsv, exportQuotationsCsv } from '@/lib/modules/export/service'

/**
 * Monthly CSV export: /api/export?type=leads|quotations&month=2026-10
 *
 * Behind login and the same permission as the estimate tool and lead
 * creation; rows are scoped to what the user can see on screen.
 */
export async function GET(request: Request): Promise<NextResponse> {
  try {
    const user = await requirePermission('lead:create')
    const url = new URL(request.url)
    const type = url.searchParams.get('type')
    const month = url.searchParams.get('month') ?? ''

    const csv =
      type === 'leads'
        ? await exportLeadsCsv(month, user)
        : type === 'quotations'
          ? await exportQuotationsCsv(month, user)
          : null

    if (csv == null) {
      return NextResponse.json({ error: 'Choose a valid month and export type.' }, { status: 400 })
    }

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="oma-${type}-${month}.csv"`,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, no-store',
      },
    }) as NextResponse
  } catch (error) {
    const exposed = toUserFacingError(error)
    return NextResponse.json({ error: exposed.message }, { status: exposed.status })
  }
}
