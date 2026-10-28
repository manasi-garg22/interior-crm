import type { Metadata } from 'next'
import Link from 'next/link'
import { requirePermissionForPage } from '@/lib/server/session'
import {
  listCustomerOptions,
  listQuotations,
  type QuotationFilters,
} from '@/lib/modules/quotation/service'
import { PageHeader } from '@/components/crm/page-header'
import { EstimateBuilder } from '@/components/crm/estimate-builder'
import { ListFilters } from '@/components/crm/list-filters'
import { Pagination, pageFrom, type SearchParams } from '@/components/ui/pagination'
import { EmptyState } from '@/components/ui/states'
import { formatInr } from '@/lib/estimate/types'
import { currentIstMonth, formatDate, formatDateTime } from '@/lib/time'
import type { FilterField } from '@/lib/view/list-filters'

export const metadata: Metadata = { title: 'Cost estimates' }
export const dynamic = 'force-dynamic'

const FIELDS: FilterField[] = [
  { kind: 'month', key: 'month', label: 'Month' },
  {
    kind: 'select',
    key: 'kind',
    label: 'Type',
    options: [
      { value: 'ESTIMATE', label: 'Estimates' },
      { value: 'BILL', label: 'Bills' },
    ],
  },
]

/**
 * Interior cost estimate builder — prices are internal, so the tool lives
 * inside the CRM behind login. Every PDF downloaded here is recorded against
 * a customer, and the register below lists them with their final amount.
 */
export default async function EstimatesPage(props: { searchParams: Promise<SearchParams> }) {
  // Matches the nav item: sales roles and admins, not designers or viewers.
  const user = await requirePermissionForPage('lead:create', '/estimates')
  const searchParams = await props.searchParams

  const get = (key: string): string | undefined => {
    const value = searchParams[key]
    return typeof value === 'string' && value.trim() ? value.trim().slice(0, 120) : undefined
  }
  const kind = get('kind')
  const filters: QuotationFilters = {
    month: get('month'),
    kind: kind === 'ESTIMATE' || kind === 'BILL' ? kind : undefined,
    q: get('q'),
  }

  const [customers, register] = await Promise.all([
    listCustomerOptions(user),
    listQuotations(filters, user, pageFrom(searchParams)),
  ])
  const thisMonth = currentIstMonth()

  return (
    <>
      <PageHeader
        title="Cost estimates"
        description="Choose the customer, add rooms and items, then download a branded PDF."
      />

      <EstimateBuilder customers={customers} />

      <section className="mt-12" aria-labelledby="register-title">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="register-title" className="font-display text-2xl tracking-tight">
              Generated PDFs
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              {register.total} {register.total === 1 ? 'document' : 'documents'} · total{' '}
              <span className="font-medium text-ink tabular-nums">
                {formatInr(register.sumTotal)}
              </span>
            </p>
          </div>

          {/* Plain GET form: the browser downloads the CSV, no script needed. */}
          <form
            action="/api/export"
            method="get"
            className="flex flex-wrap items-end gap-2 border border-line bg-surface p-3"
          >
            <label className="text-sm">
              <span className="mb-1 block text-ink-muted">Export</span>
              <select
                name="type"
                defaultValue="leads"
                className="h-10 rounded-[2px] border border-line-strong bg-surface px-3 text-sm"
              >
                <option value="leads">All leads received</option>
                <option value="quotations">Generated PDFs</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-ink-muted">Month</span>
              <input
                type="month"
                name="month"
                required
                defaultValue={filters.month ?? thisMonth}
                max={thisMonth}
                className="h-10 rounded-[2px] border border-line-strong bg-surface px-3 text-sm"
              />
            </label>
            <button
              type="submit"
              className="h-10 rounded-[2px] bg-ink px-4 text-sm font-medium text-ink-inverse hover:bg-ink-soft"
            >
              Download Excel (CSV)
            </button>
          </form>
        </div>

        <ListFilters
          basePath="/estimates"
          searchPlaceholder="Search customer, phone or project name"
          fields={FIELDS}
        />

        {register.rows.length === 0 ? (
          <EmptyState
            title="No PDFs yet"
            description="Every estimate or bill you download above is listed here with its customer and amount."
          />
        ) : (
          <>
            <div className="overflow-x-auto border border-line bg-surface">
              <table className="w-full min-w-[48rem] text-sm">
                <thead className="border-b border-line bg-surface-sunken text-left">
                  <tr>
                    <Th>Created</Th>
                    <Th>Type</Th>
                    <Th>Customer</Th>
                    <Th>Client / project</Th>
                    <Th>Items</Th>
                    <Th className="text-right">Final amount</Th>
                    <Th>By</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {register.rows.map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3 whitespace-nowrap text-ink-soft">
                        {formatDateTime(row.createdAt)}
                        {row.documentDate ? (
                          <div className="text-xs text-ink-muted">
                            PDF date {formatDate(row.documentDate)}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            row.kind === 'BILL'
                              ? 'rounded-full bg-success-soft px-2.5 py-1 text-xs font-medium text-success'
                              : 'rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent'
                          }
                        >
                          {row.kind === 'BILL' ? 'Bill' : 'Estimate'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/customers/${row.customer.id}`}
                          className="font-medium hover:underline"
                        >
                          {row.customer.fullName}
                        </Link>
                        <div className="text-xs text-ink-muted">{row.customer.phone}</div>
                      </td>
                      <td className="px-4 py-3 text-ink-soft">{row.clientName ?? '—'}</td>
                      <td className="px-4 py-3 text-ink-soft tabular-nums">{row.itemCount}</td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums">
                        {formatInr(row.total)}
                      </td>
                      <td className="px-4 py-3 text-ink-soft">{row.createdBy.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              basePath="/estimates"
              page={register.page}
              pageCount={register.pageCount}
              total={register.total}
              pageSize={register.pageSize}
              searchParams={searchParams}
            />
          </>
        )}
      </section>
    </>
  )
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`px-4 py-3 font-medium whitespace-nowrap text-ink-soft ${className ?? ''}`}>
      {children}
    </th>
  )
}
