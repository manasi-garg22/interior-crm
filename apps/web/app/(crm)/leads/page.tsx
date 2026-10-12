import type { Metadata } from 'next'
import Link from 'next/link'
import { can, type Role } from '@crm/config'
import { requireUser } from '@/lib/server/session'
import { listLeadsForUser, parseLeadFilters } from '@/lib/modules/lead/list'
import { listAssignableUsers } from '@/lib/modules/user/repository'
import { getPublicFormOptions } from '@/lib/modules/options/service'
import { PageHeader } from '@/components/crm/page-header'
import { ListFilters } from '@/components/crm/list-filters'
import { Pagination, type SearchParams } from '@/components/ui/pagination'
import { leadFilterFields } from '@/lib/view/lead-filter-fields'
import { StatusBadge, TemperatureBadge, titleCase } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/states'
import { formatDate } from '@/lib/time'
import { formatInrCompact } from '@/lib/view/amount'

export const metadata: Metadata = { title: 'Leads' }
export const dynamic = 'force-dynamic'

export default async function LeadsPage(props: { searchParams: Promise<SearchParams> }) {
  const user = await requireUser('/leads')
  const searchParams = await props.searchParams

  const filters = parseLeadFilters(searchParams)
  const canFilterByAssignee = can(user.role as Role, 'lead:read:all')
  const [result, assignees, options] = await Promise.all([
    listLeadsForUser(filters, user),
    canFilterByAssignee ? listAssignableUsers() : Promise.resolve([]),
    getPublicFormOptions(),
  ])

  return (
    <>
      <PageHeader
        title="Leads"
        description={`${result.total} ${result.total === 1 ? 'lead' : 'leads'}`}
      />

      <ListFilters
        basePath="/leads"
        searchPlaceholder="Search name, phone, email or lead number"
        fields={leadFilterFields({
          assignees: assignees.map((person) => ({ id: person.id, name: person.name })),
          canFilterByAssignee,
          budgets: options.budgetRanges,
        })}
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
                  <Th>Budget / deal</Th>
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
                      {lead.wonValue != null ? (
                        <span className="font-medium text-success" title="Locked deal value">
                          {formatInrCompact(Number(lead.wonValue))}
                        </span>
                      ) : (
                        formatBudget(lead.requirement?.budgetMin, lead.requirement?.budgetMax)
                      )}
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{titleCase(lead.source)}</td>
                    <td className="px-4 py-3">
                      <TemperatureBadge temperature={lead.temperature} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={lead.status} />
                    </td>
                    <td className="px-4 py-3 text-ink-soft">
                      {lead.assignedTo?.name ?? <span className="text-ink-muted">Unassigned</span>}
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
                    {lead.requirement ? (
                      <span>{titleCase(lead.requirement.propertyType)}</span>
                    ) : null}
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
            basePath="/leads"
            page={result.page}
            pageCount={result.pageCount}
            total={result.total}
            pageSize={result.pageSize}
            searchParams={searchParams}
          />
        </>
      )}
    </>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 font-medium whitespace-nowrap text-ink-soft">{children}</th>
}

// `overdue` is computed in the service, not here — reading the clock during
// render is impure and would desynchronise the server and client markup.
function FollowUpCell({ date, overdue }: { date: Date | null; overdue: boolean }) {
  if (!date) return <span className="text-ink-muted">—</span>

  return (
    <span className={overdue ? 'font-medium text-danger' : 'text-ink-soft'}>
      {formatDate(date, { year: undefined })}
      {overdue ? ' · overdue' : ''}
    </span>
  )
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
