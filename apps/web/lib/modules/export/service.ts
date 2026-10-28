import { leadScopeFor, type SessionUser } from '@/lib/server/session'
import { formatDateTime, istMonthRange } from '@/lib/time'
import { quotationsForExport } from '@/lib/modules/quotation/service'
import { toCsv } from './csv'
import * as repository from './repository'

/**
 * Monthly CSV exports. The month is an IST calendar month ("2026-10").
 * Row scoping matches the screens: a sales executive exports only their own
 * leads and the quotations they made.
 */

const humanize = (value: string | null | undefined): string =>
  value
    ? value
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase())
    : ''

const money = (value: unknown): string => (value == null ? '' : Number(value).toFixed(2))

export async function exportLeadsCsv(month: string, user: SessionUser): Promise<string | null> {
  const range = istMonthRange(month)
  if (!range) return null

  const leads = await repository.findLeadsForExport(
    range,
    leadScopeFor(user) === 'assigned' ? user.id : undefined,
  )

  const header = [
    'Lead number',
    'Received (IST)',
    'Customer name',
    'Phone',
    'WhatsApp',
    'Email',
    'Customer city',
    'Prefers',
    'Status',
    'Temperature',
    'Score',
    'Source',
    'Campaign',
    'UTM source',
    'UTM campaign',
    'Owner',
    'Property type',
    'Property status',
    'Location',
    'Project city',
    'Pincode',
    'Area (sq ft)',
    'Floors',
    'Spaces',
    'Other spaces',
    'Design styles',
    'Budget',
    'Budget min (₹)',
    'Budget max (₹)',
    'Timeline',
    'Requirements (in their words)',
    'Deal value (₹)',
    'Won on (IST)',
    'Lost reason',
    'Repeat enquiry',
  ]

  const rows = leads.map((lead) => {
    const r = lead.requirement
    return [
      lead.leadNumber,
      formatDateTime(lead.createdAt),
      lead.customer.fullName,
      lead.customer.phone,
      lead.customer.whatsappNumber,
      lead.customer.email,
      lead.customer.city,
      humanize(lead.customer.preferredContact),
      humanize(lead.status),
      humanize(lead.temperature),
      lead.score,
      humanize(lead.source),
      lead.campaign?.name,
      lead.utmSource,
      lead.utmCampaign,
      lead.assignedTo?.name ?? 'Unassigned',
      r
        ? r.propertyType === 'OTHER'
          ? (r.propertyTypeOther ?? 'Other')
          : humanize(r.propertyType)
        : '',
      humanize(r?.propertyStatus),
      r?.locationLine,
      r?.city,
      r?.pincode,
      r?.areaSqft,
      r?.floors,
      r?.spaceRequirements.map(humanize).join('; '),
      r?.spaceOther,
      r?.designStyles.map(humanize).join('; '),
      humanize(r?.budgetKey),
      money(r?.budgetMin),
      money(r?.budgetMax),
      humanize(r?.timelineKey),
      r?.notes,
      money(lead.wonValue),
      lead.wonAt ? formatDateTime(lead.wonAt) : '',
      lead.lostReason,
      lead.isRepeatEnquiry ? 'Yes' : 'No',
    ]
  })

  return toCsv(header, rows)
}

export async function exportQuotationsCsv(
  month: string,
  user: SessionUser,
): Promise<string | null> {
  if (!istMonthRange(month)) return null
  const rows = await quotationsForExport({ month }, user)

  return toCsv(
    [
      'Created (IST)',
      'Type',
      'Customer',
      'Phone',
      'City',
      'Client / project name',
      'PDF date',
      'Items',
      'Final amount (₹)',
      'Created by',
    ],
    rows.map((row) => [
      formatDateTime(row.createdAt),
      row.kind === 'BILL' ? 'Bill' : 'Estimate',
      row.customer.fullName,
      row.customer.phone,
      row.customer.city,
      row.clientName,
      row.documentDate ? row.documentDate.toISOString().slice(0, 10) : '',
      row.itemCount,
      row.total.toFixed(2),
      row.createdBy.name,
    ]),
  )
}
