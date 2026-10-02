import { ButtonLink } from '@/components/ui/button'
import { PageHeader } from './page-header'

/**
 * Honest placeholder for a screen scheduled in a later phase.
 *
 * Preferable to a 404 from a nav link, and preferable to a fake dashboard:
 * it states plainly what the screen will do and which phase builds it, so
 * nobody mistakes an empty page for a broken one.
 */
export function PlannedScreen({
  title,
  phase,
  description,
  capabilities,
}: {
  title: string
  phase: string
  description: string
  capabilities: string[]
}) {
  return (
    <>
      <PageHeader title={title} description={description} />

      <div className="border border-dashed border-line-strong bg-surface p-6 sm:p-8">
        <span className="inline-flex rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">
          Planned · {phase}
        </span>

        <p className="mt-5 text-sm text-ink-soft">This screen will provide:</p>
        <ul className="mt-3 space-y-2">
          {capabilities.map((capability) => (
            <li key={capability} className="flex items-baseline gap-3 text-[0.9375rem]">
              <span aria-hidden className="h-px w-4 shrink-0 bg-line-strong" />
              {capability}
            </li>
          ))}
        </ul>

        <p className="mt-6 text-sm text-ink-muted">
          The database schema already supports all of the above — no migration is required to
          build it.
        </p>

        <div className="mt-6">
          <ButtonLink href="/leads" variant="secondary" size="sm">
            Go to leads
          </ButtonLink>
        </div>
      </div>
    </>
  )
}
