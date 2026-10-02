import { cn } from '@/lib/utils/cn'

type Tone = 'neutral' | 'hot' | 'warm' | 'cold' | 'success' | 'danger' | 'accent'

const TONES: Record<Tone, string> = {
  neutral: 'bg-surface-sunken text-ink-soft',
  hot: 'bg-hot-soft text-hot',
  warm: 'bg-warm-soft text-warm',
  cold: 'bg-cold-soft text-cold',
  success: 'bg-success-soft text-success',
  danger: 'bg-danger-soft text-danger',
  accent: 'bg-accent-soft text-accent',
}

export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: Tone
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

/** Lead temperature always reads with the same colour across the app. */
export function TemperatureBadge({ temperature }: { temperature: string }) {
  const tone: Tone =
    temperature === 'HOT' ? 'hot' : temperature === 'WARM' ? 'warm' : 'cold'
  return <Badge tone={tone}>{titleCase(temperature)}</Badge>
}

const WON_OR_LOST: Record<string, Tone> = { WON: 'success', LOST: 'danger' }

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={WON_OR_LOST[status] ?? 'neutral'}>{titleCase(status)}</Badge>
}

export function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
