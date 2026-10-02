import { cn } from '@/lib/utils/cn'

/**
 * Loading, empty and error states.
 *
 * The brief is explicit that no screen may go blank when an API fails, so
 * these exist as shared components rather than being improvised per page.
 */

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center border border-dashed border-line-strong bg-surface px-6 py-16 text-center">
      <p className="font-display text-xl tracking-tight">{title}</p>
      {description ? (
        <p className="mt-2 max-w-sm text-sm text-ink-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  )
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'We could not load this. Try again in a moment.',
  action,
}: {
  title?: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center border border-danger/30 bg-danger-soft px-6 py-14 text-center"
    >
      <p className="font-display text-xl tracking-tight text-danger">{title}</p>
      <p className="mt-2 max-w-sm text-sm text-danger/80">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-[2px] bg-surface-sunken', className)} />
}

export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-px border border-line bg-line">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-4 bg-surface px-4 py-4">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  )
}
