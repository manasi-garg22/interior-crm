import type { Metadata } from 'next'
import Link from 'next/link'
import { requireUser } from '@/lib/server/session'
import { listCustomers } from '@/lib/modules/customer/service'
import { PageHeader } from '@/components/crm/page-header'
import { ListFilters } from '@/components/crm/list-filters'
import { Pagination, pageFrom, type SearchParams } from '@/components/ui/pagination'
import { EmptyState } from '@/components/ui/states'
import { LEAD_STATUS_VALUES } from '@/lib/view/lead-filter-fields'
import type { FilterField } from '@/lib/view/list-filters'

export const metadata: Metadata = { title: 'Customers' }
export const dynamic = 'force-dynamic'

const titleCase = (value: string): string =>
  value
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

const FIELDS: FilterField[] = [
  { kind: 'text', key: 'city', label: 'City', placeholder: 'City' },
  {
    kind: 'select',
    key: 'source',
    label: 'First source',
    options: [
      'INSTAGRAM',
      'FACEBOOK',
      'GOOGLE',
      'WEBSITE',
      'WHATSAPP',
      'REFERRAL',
      'DIRECT',
      'OTHER',
    ].map((value) => ({ value, label: titleCase(value) })),
  },
  {
    kind: 'select',
    key: 'status',
    label: 'Has a lead in',
    anyLabel: 'Lead status: any',
    options: LEAD_STATUS_VALUES.map((value) => ({ value, label: titleCase(value) })),
  },
  { kind: 'date', key: 'createdFrom', label: 'From' },
  { kind: 'date', key: 'createdTo', label: 'To' },
  {
    kind: 'select',
    key: 'sort',
    label: 'Sort',
    anyLabel: 'Newest first',
    options: [
      { value: 'oldest', label: 'Oldest first' },
      { value: 'name', label: 'Name A–Z' },
    ],
  },
]

const FILTER_KEYS = ['q', ...FIELDS.map((field) => field.key)]

export default async function CustomersPage(props: { searchParams: Promise<SearchParams> }) {
  const user = await requireUser('/customers')
  const searchParams = await props.searchParams

  const result = await listCustomers(searchParams, user, pageFrom(searchParams))
  const filtered = FILTER_KEYS.some((key) => searchParams[key])

  return (
    <>
      <PageHeader
        title="Customers"
        description={`${result.total} ${result.total === 1 ? 'customer' : 'customers'} · one record per person, however many times they enquire.`}
      />

      <ListFilters
        basePath="/customers"
        searchPlaceholder="Search by name, phone or email"
        fields={FIELDS}
      />

      {result.rows.length === 0 ? (
        <EmptyState
          title={filtered ? 'No customers match' : 'No customers yet'}
          description={
            filtered
              ? 'Try a different search or clear the filters.'
              : 'Customers are created automatically from website enquiries.'
          }
        />
      ) : (
        <>
          <ul className="divide-y divide-line border border-line bg-surface">
            {result.rows.map((customer) => (
              <li key={customer.id}>
                <Link
                  href={`/customers/${customer.id}`}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-4 transition-colors hover:bg-surface-sunken sm:px-5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{customer.fullName}</p>
                    <p className="truncate text-sm text-ink-muted">
                      {customer.phone}
                      {customer.email ? ` · ${customer.email}` : ''}
                    </p>
                  </div>

                  {customer.city ? (
                    <span className="text-sm text-ink-soft">{customer.city}</span>
                  ) : null}

                  <span className="text-sm text-ink-muted">
                    {customer._count.leads} {customer._count.leads === 1 ? 'lead' : 'leads'}
                    {customer._count.projects > 0
                      ? ` · ${customer._count.projects} project${customer._count.projects === 1 ? '' : 's'}`
                      : ''}
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <Pagination
            basePath="/customers"
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
