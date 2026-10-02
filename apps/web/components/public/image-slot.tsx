import { cn } from '@/lib/utils/cn'

/**
 * Placeholder for photography.
 *
 * The brief calls for strong photography, and this project has no assets yet.
 * Rather than ship broken <img> tags or a grey box, this renders a layered
 * architectural composition in CSS — plaster tones, a horizon line, a soft
 * light wash — so the page reads as finished while the real images are
 * commissioned.
 *
 * Replace with next/image and set `priority` on the hero when assets land.
 */

type Tone = 'plaster' | 'stone' | 'clay' | 'shadow'

const TONES: Record<Tone, { base: string; wash: string; plane: string }> = {
  plaster: { base: '#e8e2d8', wash: '#f4efe7', plane: '#d8d0c2' },
  stone: { base: '#d9d4cb', wash: '#e9e5dd', plane: '#c4bdb1' },
  clay: { base: '#e0cdbf', wash: '#efe0d5', plane: '#cbb19e' },
  shadow: { base: '#4a4740', wash: '#615c53', plane: '#37342e' },
}

export function ImageSlot({
  tone = 'plaster',
  className,
  label,
  rounded = true,
}: {
  tone?: Tone
  className?: string
  /** Describes the photograph that belongs here, for whoever sources it. */
  label?: string
  rounded?: boolean
}) {
  const { base, wash, plane } = TONES[tone]

  return (
    <div
      role="img"
      aria-label={label ?? 'Interior photography'}
      className={cn('relative overflow-hidden', rounded && 'rounded-[2px]', className)}
      style={{ backgroundColor: base }}
    >
      {/* light wash from the top-left, as if from a window */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(120% 90% at 18% 8%, ${wash} 0%, transparent 62%)`,
        }}
      />
      {/* floor / wall division */}
      <div
        className="absolute inset-x-0 bottom-0 h-[38%]"
        style={{ backgroundColor: plane, opacity: 0.55 }}
      />
      {/* a vertical architectural element */}
      <div
        className="absolute bottom-0 left-[22%] top-[14%] w-px"
        style={{ backgroundColor: plane, opacity: 0.8 }}
      />
      <div
        className="absolute bottom-[38%] left-[58%] h-[26%] w-[24%]"
        style={{ backgroundColor: wash, opacity: 0.5 }}
      />
      {/* grain, so large flat areas do not band on wide screens */}
      <div
        className="absolute inset-0 opacity-[0.035] mix-blend-multiply"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
    </div>
  )
}
