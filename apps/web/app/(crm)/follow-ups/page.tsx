import type { Metadata } from 'next'
import Link from 'next/link'
import { requireUser } from '@/lib/server/session'
import { listBucket } from '@/lib/modules/followup/service'
import { isBucket, type Bucket } from '@/lib/modules/followup/buckets'
import { PageHeader } from '@/components/crm/page-header'
import { FollowUpCard, type FollowUpCardData } from '@/components/crm/follow-up-card'
import { EmptyState } from '@/components/ui/states'
import { cn } from '@/lib/utils/cn'

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

export default async function FollowUpsPage(props: {
  searchParams: Promise<{ bucket?: string; overdue?: string }>
}) {
  const user = await requireUser('/follow-ups')
  const { bucket: rawBucket, overdue } = await props.searchParams

  // The dashboard links here with ?overdue=1; honour that as a bucket.
  const bucket: Bucket = isBucket(rawBucket) ? rawBucket : overdue ? 'overdue' : 'today'

  const { rows, counts } = await listBucket(bucket, user)
  const empty = EMPTY_COPY[bucket]

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
              href={`/follow-ups?bucket=${item.id}`}
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

      {rows.length === 0 ? (
        <EmptyState title={empty.title} description={empty.description} />
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <FollowUpCard key={row.id} followUp={toCardData(row)} />
          ))}
        </ul>
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
    scheduledAt: row.scheduledAt.toLocaleString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
    }),
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
