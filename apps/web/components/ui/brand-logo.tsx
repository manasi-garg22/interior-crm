import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/lib/utils/cn'

// The OM monogram is 320×188; keep that ratio wherever it is drawn.
const MARK_RATIO = 320 / 188

const SIZES = {
  sm: { mark: 26, text: 'text-base' },
  md: { mark: 34, text: 'text-lg sm:text-xl' },
  lg: { mark: 46, text: 'text-2xl' },
} as const

/**
 * The OM Arch monogram beside the company name.
 *
 * The mark is decorative (empty alt) because the name sits right next to it,
 * so screen readers announce the brand once rather than twice.
 */
export function BrandLogo({
  companyName,
  href,
  size = 'md',
  className,
  onClick,
}: {
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
      <span className={cn('font-display tracking-tight', s.text)}>{companyName}</span>
    </>
  )
  const classes = cn('inline-flex items-center gap-2.5', className)

  return href ? (
    <Link href={href} className={classes} onClick={onClick}>
      {content}
    </Link>
  ) : (
    <span className={classes}>{content}</span>
  )
}
