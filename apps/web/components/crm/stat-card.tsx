import Link from 'next/link'
import { cn } from '@/lib/utils/cn'

export function StatCard({
  label,
  value,
  suffix,
  href,
  emphasis,
}: {
  label: string
  value: number | string
  suffix?: string
  href?: string
  /** Draws attention to figures that mean someone must act today. */
  emphasis?: 'danger' | 'hot'
}) {
  const body = (
    <>
      <p className="text-sm text-ink-muted">{label}</p>
      <p
        className={cn(
          'mt-2 font-display text-3xl tracking-tight',
          emphasis === 'danger' && Number(value) > 0 && 'text-danger',
          emphasis === 'hot' && Number(value) > 0 && 'text-hot',
        )}
      >
        {value}
        {suffix ? <span className="ml-1 text-xl text-ink-muted">{suffix}</span> : null}
      </p>
    </>
  )

  const className = cn(
    'block border border-line bg-surface px-5 py-5 transition-colors',
    href && 'hover:border-ink-muted',
  )

  return href ? (
    <Link href={href} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  )
}

/** Horizontal bar breakdown — reads better than a pie at this size. */
export function BreakdownCard({
  title,
  rows,
  formatKey,
}: {
  title: string
  rows: { key: string; count: number }[]
  formatKey?: (key: string) => string
}) {
  const max = Math.max(1, ...rows.map((row) => row.count))

  return (
    <div className="border border-line bg-surface p-5">
      <p className="eyebrow">{title}</p>

      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-ink-muted">No data yet.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.slice(0, 6).map((row) => (
            <li key={row.key}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate">{formatKey ? formatKey(row.key) : row.key}</span>
                <span className="shrink-0 tabular-nums text-ink-muted">{row.count}</span>
              </div>
              <div className="mt-1.5 h-1 w-full bg-surface-sunken">
                <div
                  className="h-full bg-ink"
                  style={{ width: `${Math.round((row.count / max) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
