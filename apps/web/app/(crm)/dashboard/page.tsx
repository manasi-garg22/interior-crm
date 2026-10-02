import type { Metadata } from 'next'
import Link from 'next/link'
import { requireUser } from '@/lib/server/session'
import { getDashboard } from '@/lib/modules/dashboard/service'
import { PageHeader } from '@/components/crm/page-header'
import { BreakdownCard, StatCard } from '@/components/crm/stat-card'
import { StatusBadge, TemperatureBadge, titleCase } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/states'

export const metadata: Metadata = { title: 'Dashboard' }
export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const user = await requireUser('/dashboard')
  const data = await getDashboard(user)

  return (
    <>
      <PageHeader
        title={`Good day, ${user.name.split(' ')[0] ?? user.name}`}
        description="Your pipeline at a glance."
      />

      {data.overdueFollowUps > 0 ? (
        <Link
          href="/follow-ups?overdue=1"
          className="mb-6 flex items-center justify-between gap-4 border border-danger/30 bg-danger-soft px-5 py-4 transition-opacity hover:opacity-90"
        >
          <span className="text-sm font-medium text-danger">
            {data.overdueFollowUps} follow-up{data.overdueFollowUps === 1 ? '' : 's'} overdue
          </span>
          <span aria-hidden className="text-danger">
            →
          </span>
        </Link>
      ) : null}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total leads" value={data.totalLeads} href="/leads" />
        <StatCard label="New" value={data.newLeads} href="/leads?status=NEW" />
        <StatCard
          label="Hot leads"
          value={data.hotLeads}
          href="/leads?temperature=HOT"
          emphasis="hot"
        />
        <StatCard label="Follow-ups today" value={data.followUpsToday} href="/follow-ups" />
        <StatCard
          label="Overdue"
          value={data.overdueFollowUps}
          href="/follow-ups?overdue=1"
          emphasis="danger"
        />
        <StatCard label="Site visits" value={data.siteVisits} href="/leads?status=SITE_VISIT" />
        <StatCard label="Won" value={data.wonProjects} href="/leads?status=WON" />
        <StatCard label="Conversion" value={data.conversionRate} suffix="%" />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <BreakdownCard title="By source" rows={data.bySource} formatKey={titleCase} />
        <BreakdownCard title="By city" rows={data.byCity} />
        <BreakdownCard title="By project type" rows={data.byPropertyType} formatKey={titleCase} />
        <BreakdownCard title="By budget" rows={data.byBudget} formatKey={formatBudgetKey} />
      </div>

      <section className="mt-10">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-display text-xl tracking-tight">Latest enquiries</h2>
          <Link href="/leads" className="text-sm text-ink-muted underline-offset-4 hover:underline">
            View all
          </Link>
        </div>

        {data.recentLeads.length === 0 ? (
          <EmptyState
            title="No leads yet"
            description="Enquiries submitted through the website will appear here."
          />
        ) : (
          <ul className="divide-y divide-line border border-line bg-surface">
            {data.recentLeads.map((lead) => (
              <li key={lead.id}>
                <Link
                  href={`/leads/${lead.id}`}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-4 transition-colors hover:bg-surface-sunken sm:px-5"
                >
                  <span className="font-mono text-xs text-ink-muted">{lead.leadNumber}</span>
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {lead.customer.fullName}
                  </span>
                  {lead.customer.city ? (
                    <span className="text-sm text-ink-muted">{lead.customer.city}</span>
                  ) : null}
                  <TemperatureBadge temperature={lead.temperature} />
                  <StatusBadge status={lead.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}

/** Budget keys are slugs like "30_50l"; the label lives in OptionValue. */
function formatBudgetKey(key: string): string {
  if (key === 'Unknown') return 'Not specified'
  return key
    .replace(/_/g, '–')
    .replace(/l$/i, ' L')
    .replace(/^under–/i, 'Under ')
    .replace(/–plus/i, '+')
}
