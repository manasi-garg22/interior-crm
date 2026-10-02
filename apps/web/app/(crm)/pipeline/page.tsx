import type { Metadata } from 'next'
import { can, type Role } from '@crm/config'
import { requireUser } from '@/lib/server/session'
import { getPipeline } from '@/lib/modules/lead/pipeline'
import { PageHeader } from '@/components/crm/page-header'
import { PipelineBoard } from '@/components/crm/pipeline-board'
import { EmptyState } from '@/components/ui/states'
import { ButtonLink } from '@/components/ui/button'

export const metadata: Metadata = { title: 'Pipeline' }
export const dynamic = 'force-dynamic'

export default async function PipelinePage() {
  const user = await requireUser('/pipeline')
  const columns = await getPipeline(user)

  const totalLeads = columns.reduce((sum, column) => sum + column.total, 0)
  const readOnly = !can(user.role as Role, 'lead:update')

  return (
    <>
      <PageHeader
        title="Pipeline"
        description={
          readOnly
            ? 'Read-only view of every stage.'
            : 'Drag a card to move a lead, or use the stage selector on the card.'
        }
      />

      {totalLeads === 0 ? (
        <EmptyState
          title="Nothing in the pipeline"
          description="Leads submitted through the website will appear here."
          action={<ButtonLink href="/leads">Go to leads</ButtonLink>}
        />
      ) : readOnly ? (
        <ReadOnlyBoard columns={columns} />
      ) : (
        <PipelineBoard columns={columns} />
      )}
    </>
  )
}

/**
 * VIEWER and DESIGNER get a static board. Rendering the draggable one and
 * letting the server reject every move would be a worse experience than not
 * offering the affordance at all.
 */
function ReadOnlyBoard({
  columns,
}: {
  columns: Awaited<ReturnType<typeof getPipeline>>
}) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map((column) => (
        <section
          key={column.status}
          className="flex w-72 shrink-0 flex-col rounded-[2px] border border-line bg-surface-sunken/60"
        >
          <header className="flex items-baseline justify-between border-b border-line px-3 py-3">
            <h2 className="text-sm font-medium">{column.status.replace(/_/g, ' ')}</h2>
            <span className="text-xs tabular-nums text-ink-muted">{column.total}</span>
          </header>
          <div className="space-y-2 p-2">
            {column.cards.map((card) => (
              <article key={card.id} className="rounded-[2px] border border-line bg-surface p-3">
                <p className="truncate text-sm font-medium">{card.customerName}</p>
                <p className="font-mono text-[0.6875rem] text-ink-muted">{card.leadNumber}</p>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
