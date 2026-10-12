import type { Metadata } from 'next'
import Link from 'next/link'
import { can, type Role } from '@crm/config'
import { requireUser } from '@/lib/server/session'
import { listBucket, parseFollowUpFilters } from '@/lib/modules/followup/service'
import { isBucket, type Bucket } from '@/lib/modules/followup/buckets'
import { listAssignableUsers } from '@/lib/modules/user/repository'
import { PageHeader } from '@/components/crm/page-header'
import { ListFilters } from '@/components/crm/list-filters'
import { Pagination, pageFrom, type SearchParams } from '@/components/ui/pagination'
import type { FilterField } from '@/lib/view/list-filters'
import { FollowUpCard, type FollowUpCardData } from '@/components/crm/follow-up-card'
import { EmptyState } from '@/components/ui/states'
import { cn } from '@/lib/utils/cn'
import { formatDateTime } from '@/lib/time'

export const metadata: Metadata = { title: 'Follow-ups' }
export const dynamic = 'force-dynamic'

const BUCKETS: { id: Bucket; label: string }[] = [
  { id: 'overdue', label: 'Overdue' },
  { id: 'today', label: 'Today' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'completed', label: 'Completed' },
]

const EMPTY_COPY: Record<Bucket, { title: string; description: string }> = {
  overdue: { title: 'Nothing overdue', description: 'Every scheduled follow-up is on time.' },
  today: { title: 'Nothing due today', description: 'Check the upcoming queue for what is next.' },
  upcoming: {
    title: 'Nothing scheduled',
    description: 'Schedule a follow-up from any lead to see it here.',
  },
  completed: { title: 'Nothing completed yet', description: 'Closed follow-ups appear here.' },
}

const titleCase = (value: string): string =>
  value
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

export default async function FollowUpsPage(props: { searchParams: Promise<SearchParams> }) {
  const user = await requireUser('/follow-ups')
  const searchParams = await props.searchParams
  const rawBucket = typeof searchParams.bucket === 'string' ? searchParams.bucket : undefined

  // The dashboard links here with ?overdue=1; honour that as a bucket.
  const bucket: Bucket = isBucket(rawBucket)
    ? rawBucket
    : searchParams.overdue
      ? 'overdue'
      : 'today'

  const canSeeAll = can(user.role as Role, 'followup:read:all')
  const filters = parseFollowUpFilters(searchParams)
  const [result, assignees] = await Promise.all([
    listBucket(bucket, user, filters, pageFrom(searchParams)),
    canSeeAll ? listAssignableUsers() : Promise.resolve([]),
  ])
  const { rows, counts } = result
  const filtered = Boolean(filters.q || filters.type || filters.temperature || filters.assignedToId)
  const empty = filtered
    ? { title: 'No follow-ups match', description: 'Try a different search or clear the filters.' }
    : EMPTY_COPY[bucket]

  const fields: FilterField[] = [
    {
      kind: 'select',
      key: 'type',
      label: 'Type',
      options: ['CALL', 'WHATSAPP', 'EMAIL', 'MEETING', 'SITE_VISIT'].map((value) => ({
        value,
        label: titleCase(value),
      })),
    },
    {
      kind: 'select',
      key: 'temperature',
      label: 'Temperature',
      options: ['HOT', 'WARM', 'COLD'].map((value) => ({ value, label: titleCase(value) })),
    },
    ...(canSeeAll
      ? [
          {
            kind: 'select' as const,
            key: 'assignedToId',
            label: 'Owner',
            anyLabel: 'Owner: anyone',
            options: assignees.map((person) => ({ value: person.id, label: person.name })),
          },
        ]
      : []),
  ]

  // Queue tabs keep the active filters but start again from page 1.
  const tabHref = (id: Bucket): string => {
    const params = new URLSearchParams()
    for (const key of ['q', 'type', 'temperature', 'assignedToId']) {
      const value = searchParams[key]
      if (typeof value === 'string' && value) params.set(key, value)
    }
    params.set('bucket', id)
    return `/follow-ups?${params.toString()}`
  }

  return (
    <>
      <PageHeader
        title="Follow-ups"
        description="Calls, visits and reminders across your pipeline."
      />

      <nav className="mb-6 flex flex-wrap gap-2" aria-label="Follow-up queues">
        {BUCKETS.map((item) => {
          const active = item.id === bucket
          const count = counts[item.id]

          return (
            <Link
              key={item.id}
              href={tabHref(item.id)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'inline-flex min-h-11 items-center gap-2 rounded-[2px] border px-4 text-sm transition-colors',
                active
                  ? 'border-ink bg-ink text-ink-inverse'
                  : 'border-line-strong bg-surface text-ink-soft hover:border-ink-muted hover:text-ink',
              )}
            >
              {item.label}
              <span
                className={cn(
                  'tabular-nums',
                  active
                    ? 'text-ink-inverse/70'
                    : item.id === 'overdue' && count > 0
                      ? 'font-medium text-danger'
                      : 'text-ink-muted',
                )}
              >
                {count}
              </span>
            </Link>
          )
        })}
      </nav>

      <ListFilters
        basePath="/follow-ups"
        searchPlaceholder="Search customer name, phone or lead number"
        fields={fields}
        preserveKeys={['bucket', 'overdue']}
      />

      {rows.length === 0 ? (
        <EmptyState title={empty.title} description={empty.description} />
      ) : (
        <>
          <ul className="space-y-3">
            {rows.map((row) => (
              <FollowUpCard key={row.id} followUp={toCardData(row)} />
            ))}
          </ul>

          <Pagination
            basePath="/follow-ups"
            page={result.page}
            pageCount={result.pageCount}
            total={result.total}
            pageSize={result.pageSize}
            searchParams={{ ...searchParams, bucket }}
          />
        </>
      )}
    </>
  )
}

type ServiceRow = Awaited<ReturnType<typeof listBucket>>['rows'][number]

/**
 * Dates are formatted on the server and passed as strings: the card is a
 * client component, and shipping Date objects across that boundary means
 * the browser's locale decides the format, which then differs from what the
 * server rendered.
 */
function toCardData(row: ServiceRow): FollowUpCardData {
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    scheduledAt: formatDateTime(row.scheduledAt, { weekday: 'short' }),
    notes: row.notes,
    outcome: row.outcome,
    isOverdue: row.isOverdue,
    assignedToName: row.assignedTo.name,
    lead: {
      id: row.lead.id,
      leadNumber: row.lead.leadNumber,
      temperature: row.lead.temperature,
      customerName: row.lead.customer.fullName,
      customerPhone: row.lead.customer.phone,
      city: row.lead.customer.city,
    },
  }
}
