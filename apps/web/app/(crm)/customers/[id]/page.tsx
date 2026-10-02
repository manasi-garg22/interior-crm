import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { buildWhatsAppDeepLink } from '@crm/whatsapp'
import { requireUser } from '@/lib/server/session'
import { getCustomerProfile } from '@/lib/modules/customer/service'
import { PageHeader } from '@/components/crm/page-header'
import { StatusBadge, TemperatureBadge, titleCase } from '@/components/ui/badge'

export const metadata: Metadata = { title: 'Customer' }
export const dynamic = 'force-dynamic'

export default async function CustomerProfilePage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const user = await requireUser(`/customers/${id}`)

  const customer = await getCustomerProfile(id, user).catch(() => null)
  if (!customer) notFound()

  return (
    <>
      <PageHeader
        title={customer.fullName}
        description={`Customer since ${formatDate(customer.createdAt)}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <a
              href={`tel:${customer.phone}`}
              className="inline-flex h-9 items-center rounded-[2px] border border-line-strong bg-surface px-3.5 text-sm hover:bg-surface-sunken"
            >
              Call
            </a>
            <a
              href={buildWhatsAppDeepLink(customer.whatsappNumber ?? customer.phone)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center rounded-[2px] border border-line-strong bg-surface px-3.5 text-sm hover:bg-surface-sunken"
            >
              WhatsApp
            </a>
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_1.6fr]">
        <div className="space-y-6">
          <Card title="Contact">
            <Detail label="Phone" value={customer.phone} />
            <Detail label="WhatsApp" value={customer.whatsappNumber} />
            <Detail label="Email" value={customer.email} />
            <Detail
              label="Location"
              value={[customer.city, customer.state, customer.country].filter(Boolean).join(', ')}
            />
            <Detail label="Prefers" value={titleCase(customer.preferredContact)} />
            <Detail label="First came from" value={titleCase(customer.firstSource)} />
          </Card>

          {customer.projects.length > 0 ? (
            <Card title={`Projects (${customer.projects.length})`}>
              <ul className="space-y-3">
                {customer.projects.map((project) => (
                  <li key={project.id}>
                    <p className="text-[0.9375rem] font-medium">{project.name}</p>
                    <p className="text-xs text-ink-muted">
                      {project.projectNumber} · {titleCase(project.status)}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {customer.documents.length > 0 ? (
            <Card title={`Documents (${customer.documents.length})`}>
              <ul className="space-y-2">
                {customer.documents.map((document) => (
                  <li key={document.id} className="flex justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate">{document.fileName}</span>
                    <span className="shrink-0 text-xs text-ink-muted">
                      {(document.sizeBytes / 1024 / 1024).toFixed(1)} MB
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>

        <div className="min-w-0 space-y-6">
          <Card title={`Enquiries (${customer.leads.length})`}>
            {customer.leads.length === 0 ? (
              <p className="text-sm text-ink-muted">No enquiries visible to you.</p>
            ) : (
              <ul className="divide-y divide-line">
                {customer.leads.map((lead) => (
                  <li key={lead.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Link
                        href={`/leads/${lead.id}`}
                        className="font-mono text-sm underline-offset-4 hover:underline"
                      >
                        {lead.leadNumber}
                      </Link>
                      <div className="flex items-center gap-2">
                        <TemperatureBadge temperature={lead.temperature} />
                        <StatusBadge status={lead.status} />
                      </div>
                    </div>

                    <p className="mt-1.5 text-sm text-ink-soft">
                      {lead.requirement
                        ? `${titleCase(lead.requirement.propertyType)}${
                            lead.requirement.areaSqft ? ` · ${lead.requirement.areaSqft} sq ft` : ''
                          }`
                        : 'No requirement captured'}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      {formatDate(lead.createdAt)}
                      {lead.assignedTo ? ` · ${lead.assignedTo.name}` : ' · unassigned'}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {customer.communications.length > 0 ? (
            <Card title="Communication history">
              <ul className="space-y-3">
                {customer.communications.map((entry) => (
                  <li key={entry.id} className="text-sm">
                    <p className="font-medium">
                      {titleCase(entry.channel)} · {titleCase(entry.direction)}
                    </p>
                    {entry.subject ? <p className="text-ink-soft">{entry.subject}</p> : null}
                    <p className="text-xs text-ink-muted">{formatDateTime(entry.occurredAt)}</p>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border border-line bg-surface p-5">
      <p className="eyebrow">{title}</p>
      <div className="mt-4 space-y-2.5">{children}</div>
    </section>
  )
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4">
      <span className="text-sm text-ink-muted">{label}</span>
      <span className="text-right text-[0.9375rem]">{value}</span>
    </div>
  )
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatDateTime(date: Date): string {
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}
