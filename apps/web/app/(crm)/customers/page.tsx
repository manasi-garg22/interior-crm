import type { Metadata } from 'next'
import Link from 'next/link'
import { requireUser } from '@/lib/server/session'
import { listCustomers } from '@/lib/modules/customer/service'
import { PageHeader } from '@/components/crm/page-header'
import { CustomerSearch } from '@/components/crm/customer-search'
import { EmptyState } from '@/components/ui/states'

export const metadata: Metadata = { title: 'Customers' }
export const dynamic = 'force-dynamic'

export default async function CustomersPage(props: {
  searchParams: Promise<{ q?: string }>
}) {
  const user = await requireUser('/customers')
  const { q } = await props.searchParams

  const customers = await listCustomers(q?.trim() || undefined, user)

  return (
    <>
      <PageHeader
        title="Customers"
        description="One record per person, however many times they enquire."
      />

      <CustomerSearch initialQuery={q ?? ''} />

      {customers.length === 0 ? (
        <EmptyState
          title={q ? 'No customers match' : 'No customers yet'}
          description={
            q
              ? 'Try a different name, phone number or email.'
              : 'Customers are created automatically from website enquiries.'
          }
        />
      ) : (
        <ul className="divide-y divide-line border border-line bg-surface">
          {customers.map((customer) => (
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
      )}
    </>
  )
}
