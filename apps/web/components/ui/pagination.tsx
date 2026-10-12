import Link from 'next/link'

export type SearchParams = Record<string, string | string[] | undefined>

/**
 * Prev / next pagination for URL-driven lists. Every other query parameter
 * (filters, search, sort) is carried over, so paging never drops a filter.
 */
export function Pagination({
  basePath,
  page,
  pageCount,
  total,
  pageSize,
  searchParams,
}: {
  basePath: string
  page: number
  pageCount: number
  total: number
  pageSize: number
  searchParams: SearchParams
}) {
  if (total === 0) return null

  const linkFor = (target: number): string => {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(searchParams)) {
      if (key === 'page' || value == null) continue
      if (Array.isArray(value)) value.forEach((item) => params.append(key, item))
      else params.set(key, value)
    }
    if (target > 1) params.set('page', String(target))
    const query = params.toString()
    return query ? `${basePath}?${query}` : basePath
  }

  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <nav
      className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm"
      aria-label="Pagination"
    >
      <span className="text-ink-muted">
        Showing {from}–{to} of {total}
      </span>

      {pageCount > 1 ? (
        <div className="flex items-center gap-1">
          <PageLink href={page > 1 ? linkFor(1) : null} label="First page">
            «
          </PageLink>
          <PageLink href={page > 1 ? linkFor(page - 1) : null} label="Previous page">
            ‹ Prev
          </PageLink>
          <span className="px-3 text-ink-soft tabular-nums">
            Page {page} of {pageCount}
          </span>
          <PageLink href={page < pageCount ? linkFor(page + 1) : null} label="Next page">
            Next ›
          </PageLink>
          <PageLink href={page < pageCount ? linkFor(pageCount) : null} label="Last page">
            »
          </PageLink>
        </div>
      ) : null}
    </nav>
  )
}

function PageLink({
  href,
  label,
  children,
}: {
  href: string | null
  label: string
  children: React.ReactNode
}) {
  const className =
    'inline-flex h-9 min-w-9 items-center justify-center rounded-[2px] border px-3 transition-colors'

  if (!href) {
    return (
      <span aria-disabled className={`${className} border-line text-ink-muted/50`}>
        {children}
      </span>
    )
  }

  return (
    <Link
      href={href}
      aria-label={label}
      className={`${className} border-line-strong bg-surface hover:bg-surface-sunken`}
    >
      {children}
    </Link>
  )
}

/** Reads a positive page number from the URL, defaulting to 1. */
export function pageFrom(searchParams: SearchParams): number {
  const raw = searchParams.page
  const value = Number(typeof raw === 'string' ? raw : 1)
  return Number.isInteger(value) && value >= 1 ? Math.min(value, 10_000) : 1
}
