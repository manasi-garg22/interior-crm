import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/lib/utils/cn'

// The OM monogram is 320×188; keep that ratio wherever it is drawn.
const MARK_RATIO = 320 / 188

const SIZES = {
  sm: { mark: 26, name: 'text-[0.8125rem]', sub: 'text-[0.4375rem]', rule: 'w-2' },
  md: { mark: 34, name: 'text-[0.9375rem] sm:text-[1.0625rem]', sub: 'text-[0.5rem] sm:text-[0.5625rem]', rule: 'w-2.5 sm:w-3' },
  lg: { mark: 46, name: 'text-[1.375rem]', sub: 'text-[0.6875rem]', rule: 'w-4' },
} as const

/**
 * The OM Arch monogram with the wordmark set the way the full logo sets it:
 * "OM ARCH" in spaced serif capitals over a gold "— DESIGNS —".
 *
 * The full stacked logo is too tall for a header — "DESIGNS" would render a
 * few pixels high — so the wordmark is typeset here instead, which stays
 * crisp and legible at every size.
 */
export function BrandLogo({
  companyName,
  href,
  size = 'md',
  className,
  onClick,
}: {
  /** Used for the accessible name; the visible wordmark is the brand's own. */
  companyName: string
  /** Wraps the logo in a link when set. */
  href?: string
  size?: keyof typeof SIZES
  className?: string
  onClick?: () => void
}) {
  const s = SIZES[size]
  const content = (
    <>
      <Image
        src="/brand/om-arch-mark.svg"
        alt=""
        width={Math.round(s.mark * MARK_RATIO)}
        height={s.mark}
        unoptimized
        loading="eager"
        className="shrink-0"
      />
      <span aria-hidden className="flex flex-col items-center leading-none">
        <span className={cn('font-display uppercase tracking-[0.16em] text-ink', s.name)}>
          OM Arch
        </span>
        <span
          className={cn(
            'mt-[0.35em] flex items-center gap-[0.5em] font-display uppercase tracking-[0.45em] text-accent',
            s.sub,
          )}
        >
          <span className={cn('h-px bg-accent/60', s.rule)} />
          {/* Trailing letter-spacing would push the word off-centre. */}
          <span className="-mr-[0.45em]">Designs</span>
          <span className={cn('h-px bg-accent/60', s.rule)} />
        </span>
      </span>
      <span className="sr-only">{companyName}</span>
    </>
  )
  const classes = cn('inline-flex items-center gap-2.5', className)

  return href ? (
    <Link href={href} className={classes} onClick={onClick} aria-label={`${companyName} — home`}>
      {content}
    </Link>
  ) : (
    <span className={classes}>{content}</span>
  )
}
