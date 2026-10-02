import type { Metadata } from 'next'
import Link from 'next/link'
import { can, type Role } from '@crm/config'
import { leadFiltersSchema } from '@crm/validation'
import { requireUser } from '@/lib/server/session'
import { listLeadsForUser } from '@/lib/modules/lead/list'
import { listAssignableUsers } from '@/lib/modules/user/repository'
import { PageHeader } from '@/components/crm/page-header'
import { LeadFilters } from '@/components/crm/lead-filters'
import { StatusBadge, TemperatureBadge, titleCase } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/states'

export const metadata: Metadata = { title: 'Leads' }
export const dynamic = 'force-dynamic'

type SearchParams = Record<string, string | string[] | undefined>

export default async function LeadsPage(props: { searchParams: Promise<SearchParams> }) {
  const user = await requireUser('/leads')
  const searchParams = await props.searchParams

  const filters = parseFilters(searchParams)
  const [result, assignees] = await Promise.all([
    listLeadsForUser(filters, user),
    can(user.role as Role, 'lead:assign') ? listAssignableUsers() : Promise.resolve([]),
  ])

  return (
    <>
      <PageHeader
        title="Leads"
        description={`${result.total} ${result.total === 1 ? 'lead' : 'leads'}`}
      />

      <LeadFilters
        assignees={assignees.map((person) => ({ id: person.id, name: person.name }))}
        canFilterByAssignee={can(user.role as Role, 'lead:read:all')}
      />

      {result.rows.length === 0 ? (
        <EmptyState
          title="No leads match"
          description="Adjust the filters, or wait for the next enquiry to arrive from the website."
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto border border-line bg-surface lg:block">
            <table className="w-full min-w-[60rem] text-sm">
              <thead className="border-b border-line bg-surface-sunken text-left">
                <tr>
                  <Th>Lead</Th>
                  <Th>Customer</Th>
                  <Th>City</Th>
                  <Th>Type</Th>
                  <Th>Budget</Th>
                  <Th>Source</Th>
                  <Th>Temp.</Th>
                  <Th>Status</Th>
                  <Th>Owner</Th>
                  <Th>Next follow-up</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {result.rows.map((lead) => (
                  <tr key={lead.id} className="transition-colors hover:bg-surface-sunken">
                    <td className="px-4 py-3">
                      <Link
                        href={`/leads/${lead.id}`}
                        className="font-mono text-xs underline-offset-4 hover:underline"
                      >
                        {lead.leadNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/leads/${lead.id}`} className="font-medium hover:underline">
                        {lead.customer.fullName}
                      </Link>
                      <div className="text-xs text-ink-muted">{lead.customer.phone}</div>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{lead.customer.city ?? '—'}</td>
                    <td className="px-4 py-3 text-ink-soft">
                      {lead.requirement ? titleCase(lead.requirement.propertyType) : '—'}
                    </td>
                    <td className="px-4 py-3 text-ink-soft">
                      {formatBudget(lead.requirement?.budgetMin, lead.requirement?.budgetMax)}
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{titleCase(lead.source)}</td>
                    <td className="px-4 py-3">
                      <TemperatureBadge temperature={lead.temperature} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={lead.status} />
                    </td>
                    <td className="px-4 py-3 text-ink-soft">
                      {lead.assignedTo?.name ?? (
                        <span className="text-ink-muted">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <FollowUpCell date={lead.nextFollowUpAt} overdue={lead.followUpOverdue} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards — a 10-column table is unusable at 375px */}
          <ul className="space-y-3 lg:hidden">
            {result.rows.map((lead) => (
              <li key={lead.id}>
                <Link
                  href={`/leads/${lead.id}`}
                  className="block border border-line bg-surface p-4 transition-colors hover:border-ink-muted"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{lead.customer.fullName}</p>
                      <p className="font-mono text-xs text-ink-muted">{lead.leadNumber}</p>
                    </div>
                    <TemperatureBadge temperature={lead.temperature} />
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-ink-muted">
                    <StatusBadge status={lead.status} />
                    {lead.customer.city ? <span>{lead.customer.city}</span> : null}
                    {lead.requirement ? <span>{titleCase(lead.requirement.propertyType)}</span> : null}
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs text-ink-muted">
                    <span>{lead.assignedTo?.name ?? 'Unassigned'}</span>
                    <FollowUpCell date={lead.nextFollowUpAt} overdue={lead.followUpOverdue} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          <Pagination
            page={result.page}
            pageCount={result.pageCount}
            searchParams={searchParams}
          />
        </>
      )}
    </>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="whitespace-nowrap px-4 py-3 font-medium text-ink-soft">{children}</th>
}

// `overdue` is computed in the service, not here — reading the clock during
// render is impure and would desynchronise the server and client markup.
function FollowUpCell({ date, overdue }: { date: Date | null; overdue: boolean }) {
  if (!date) return <span className="text-ink-muted">—</span>

  return (
    <span className={overdue ? 'font-medium text-danger' : 'text-ink-soft'}>
      {date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
      {overdue ? ' · overdue' : ''}
    </span>
  )
}

function Pagination({
  page,
  pageCount,
  searchParams,
}: {
  page: number
  pageCount: number
  searchParams: SearchParams
}) {
  if (pageCount <= 1) return null

  const linkFor = (target: number): string => {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(searchParams)) {
      if (typeof value === 'string' && key !== 'page') params.set(key, value)
    }
    params.set('page', String(target))
    return `/leads?${params.toString()}`
  }

  return (
    <nav className="mt-6 flex items-center justify-between" aria-label="Pagination">
      {page > 1 ? (
        <Link href={linkFor(page - 1)} className="text-sm underline-offset-4 hover:underline">
          ← Previous
        </Link>
      ) : (
        <span />
      )}

      <span className="text-sm text-ink-muted">
        Page {page} of {pageCount}
      </span>

      {page < pageCount ? (
        <Link href={linkFor(page + 1)} className="text-sm underline-offset-4 hover:underline">
          Next →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  )
}

/**
 * Query parameters are untrusted. Anything that fails the schema falls back
 * to the documented default rather than reaching the database.
 */
function parseFilters(searchParams: SearchParams) {
  const single = (key: string): string | undefined => {
    const value = searchParams[key]
    return typeof value === 'string' && value !== '' ? value : undefined
  }
  const asList = (key: string): string[] | undefined => {
    const value = single(key)
    return value ? value.split(',') : undefined
  }

  const parsed = leadFiltersSchema.safeParse({
    q: single('q'),
    status: asList('status'),
    temperature: asList('temperature'),
    source: asList('source'),
    assignedToId: single('assignedToId'),
    city: single('city'),
    budgetKey: single('budgetKey'),
    campaignId: single('campaignId'),
    createdFrom: single('createdFrom'),
    createdTo: single('createdTo'),
    overdueFollowUp: single('overdue'),
    sortBy: single('sortBy'),
    sortDir: single('sortDir'),
    page: single('page'),
    pageSize: single('pageSize'),
  })

  return parsed.success ? parsed.data : leadFiltersSchema.parse({})
}

function formatBudget(min: unknown, max: unknown): string {
  const toLakh = (value: unknown): number | null =>
    value == null ? null : Math.round(Number(value) / 100_000)

  const low = toLakh(min)
  const high = toLakh(max)

  if (low == null && high == null) return '—'
  if (low == null) return `Under ₹${high}L`
  if (high == null) return `₹${low}L+`
  return `₹${low}–${high}L`
}
