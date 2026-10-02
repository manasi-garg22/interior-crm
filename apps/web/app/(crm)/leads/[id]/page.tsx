import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { can, type Role } from '@crm/config'
import { buildWhatsAppDeepLink } from '@crm/whatsapp'
import { requireUser } from '@/lib/server/session'
import { getLeadDetail } from '@/lib/modules/lead/mutations'
import { listAssignableUsers } from '@/lib/modules/user/repository'
import { PageHeader } from '@/components/crm/page-header'
import { LeadActionPanel } from '@/components/crm/lead-actions'
import { DocumentPanel } from '@/components/crm/document-panel'
import { StatusBadge, TemperatureBadge, titleCase } from '@/components/ui/badge'

export const metadata: Metadata = { title: 'Lead' }
export const dynamic = 'force-dynamic'

type ScoreContribution = { rule: string; label: string; points: number }

export default async function LeadDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const user = await requireUser(`/leads/${id}`)

  const lead = await getLeadDetail(id, user).catch(() => null)
  if (!lead) notFound()

  const role = user.role as Role
  const canAssign = can(role, 'lead:assign')
  const assignees = canAssign || can(role, 'followup:create') ? await listAssignableUsers() : []

  const requirement = lead.requirement
  const breakdown = (lead.scoreBreakdown as ScoreContribution[] | null) ?? []

  return (
    <>
      <PageHeader
        title={lead.customer.fullName}
        description={`${lead.leadNumber} · created ${formatDate(lead.createdAt)}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <a
              href={`tel:${lead.customer.phone}`}
              className="inline-flex h-9 items-center rounded-[2px] border border-line-strong bg-surface px-3.5 text-sm hover:bg-surface-sunken"
            >
              Call
            </a>
            <a
              href={buildWhatsAppDeepLink(
                lead.customer.whatsappNumber ?? lead.customer.phone,
                `Hello ${lead.customer.fullName}, regarding your interior project enquiry ${lead.leadNumber}.`,
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center rounded-[2px] border border-line-strong bg-surface px-3.5 text-sm hover:bg-surface-sunken"
            >
              WhatsApp
            </a>
            {lead.customer.email ? (
              <a
                href={`mailto:${lead.customer.email}`}
                className="inline-flex h-9 items-center rounded-[2px] border border-line-strong bg-surface px-3.5 text-sm hover:bg-surface-sunken"
              >
                Email
              </a>
            ) : null}
          </div>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <StatusBadge status={lead.status} />
        <TemperatureBadge temperature={lead.temperature} />
        <span className="text-sm text-ink-muted">Score {lead.score}/100</span>
        <span className="text-sm text-ink-muted">· {titleCase(lead.source)}</span>
        {lead.isRepeatEnquiry ? (
          <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">
            Existing customer — new enquiry
          </span>
        ) : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="min-w-0 space-y-6">
          <Card title="Customer">
            <Detail label="Name" value={lead.customer.fullName} />
            <Detail label="Phone" value={lead.customer.phone} />
            <Detail label="WhatsApp" value={lead.customer.whatsappNumber} />
            <Detail label="Email" value={lead.customer.email} />
            <Detail
              label="Location"
              value={[lead.customer.city, lead.customer.state].filter(Boolean).join(', ')}
            />
            <Detail label="Prefers" value={titleCase(lead.customer.preferredContact)} />
            <div className="pt-2">
              <Link
                href={`/customers/${lead.customerId}`}
                className="text-sm underline underline-offset-4"
              >
                View full customer profile
              </Link>
            </div>
          </Card>

          {requirement ? (
            <Card title="Project requirements">
              <Detail
                label="Property type"
                value={
                  requirement.propertyType === 'OTHER'
                    ? (requirement.propertyTypeOther ?? 'Other')
                    : titleCase(requirement.propertyType)
                }
              />
              <Detail label="Property status" value={titleCase(requirement.propertyStatus)} />
              <Detail
                label="Location"
                value={[requirement.locationLine, requirement.city].filter(Boolean).join(', ')}
              />
              <Detail
                label="Area"
                value={requirement.areaSqft ? `${requirement.areaSqft} sq ft` : null}
              />
              <Detail label="Floors" value={requirement.floors?.toString()} />
              <Detail
                label="Possession"
                value={requirement.possessionDate ? formatDate(requirement.possessionDate) : null}
              />
              <Detail
                label="Budget"
                value={formatBudget(requirement.budgetMin, requirement.budgetMax)}
              />
              <Detail label="Timeline" value={humanize(requirement.timelineKey)} />
              <Detail
                label="Areas"
                value={requirement.spaceRequirements.map(humanize).join(', ')}
              />
              <Detail label="Also" value={requirement.spaceOther} />
              <Detail label="Styles" value={requirement.designStyles.map(humanize).join(', ')} />

              {requirement.notes ? (
                <div className="pt-2">
                  <p className="text-sm text-ink-muted">In their words</p>
                  <p className="mt-1 whitespace-pre-wrap text-[0.9375rem] leading-relaxed">
                    {requirement.notes}
                  </p>
                </div>
              ) : null}
            </Card>
          ) : null}

          <Card title="Activity timeline">
            {lead.activities.length === 0 ? (
              <p className="text-sm text-ink-muted">Nothing recorded yet.</p>
            ) : (
              <ol className="relative space-y-5 border-l border-line pl-5">
                {lead.activities.map((activity) => (
                  <li key={activity.id} className="relative">
                    <span
                      aria-hidden
                      className="absolute -left-[1.4375rem] top-1.5 size-2 rounded-full bg-line-strong"
                    />
                    <p className="text-[0.9375rem] font-medium">{activity.title}</p>
                    {activity.description ? (
                      <p className="mt-1 whitespace-pre-wrap text-sm text-ink-soft">
                        {activity.description}
                      </p>
                    ) : null}
                    <p className="mt-1 text-xs text-ink-muted">
                      {formatDateTime(activity.createdAt)}
                      {activity.user ? ` · ${activity.user.name}` : ' · system'}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>

        <div className="min-w-0 space-y-6">
          <Card title="Lead score">
            <p className="font-display text-4xl tracking-tight">{lead.score}</p>
            {breakdown.length === 0 ? (
              <p className="mt-2 text-sm text-ink-muted">No scoring rules matched.</p>
            ) : (
              <ul className="mt-3 space-y-1.5">
                {breakdown.map((item) => (
                  <li key={item.rule} className="flex justify-between text-sm">
                    <span className="text-ink-soft">{item.label}</span>
                    <span className="tabular-nums">+{item.points}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Ownership">
            <Detail label="Assigned to" value={lead.assignedTo?.name ?? 'Unassigned'} />
            <Detail label="Campaign" value={lead.campaign?.name} />
            <Detail label="UTM source" value={lead.utmSource} />
            <Detail label="UTM campaign" value={lead.utmCampaign} />
            <Detail label="UTM content" value={lead.utmContent} />
          </Card>

          {lead.followUps.length > 0 ? (
            <Card title="Follow-ups">
              <ul className="space-y-3">
                {lead.followUps.map((followUp) => (
                  <li key={followUp.id} className="text-sm">
                    <p className="font-medium">
                      {titleCase(followUp.type)} · {formatDateTime(followUp.scheduledAt)}
                    </p>
                    <p className="text-xs text-ink-muted">
                      {titleCase(followUp.status)} · {followUp.assignedTo.name}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          <DocumentPanel
            leadId={lead.id}
            canUpload={can(role, 'document:upload')}
            documents={lead.documents.map((document) => ({
              id: document.id,
              fileName: document.fileName,
              sizeBytes: document.sizeBytes,
              category: document.category,
              createdAt: formatDate(document.createdAt),
            }))}
          />

          <LeadActionPanel
            leadId={lead.id}
            currentStatus={lead.status}
            currentAssigneeId={lead.assignedToId}
            assignees={assignees.map((person) => ({ id: person.id, name: person.name }))}
            permissions={{
              canAssign,
              canUpdate: can(role, 'lead:update'),
              canCreateFollowUp: can(role, 'followup:create'),
            }}
          />
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
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
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

/** Option keys are slugs; this is a readable fallback for the label. */
function humanize(value: string | null): string {
  if (!value) return ''
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatBudget(min: unknown, max: unknown): string | null {
  const toLakh = (value: unknown): number | null =>
    value == null ? null : Math.round(Number(value) / 100_000)

  const low = toLakh(min)
  const high = toLakh(max)

  if (low == null && high == null) return null
  if (low == null) return `Under ₹${high} Lakh`
  if (high == null) return `₹${low} Lakh+`
  return `₹${low}–${high} Lakh`
}
