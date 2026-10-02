import { cn } from '@/lib/utils/cn'

/**
 * The 1 ─ 2 ─ 3 ─ 4 ─ 5 ─ 6 progress rail.
 *
 * On phones the numbered rail collapses to a single progress bar plus
 * "Step 2 of 6" — six labelled nodes at 375px would be unreadable, and the
 * brief says not to overwhelm the customer.
 */
export function StepIndicator({
  steps,
  current,
}: {
  steps: readonly { index: number; title: string }[]
  current: number
}) {
  const total = steps.length
  const percent = Math.round(((current - 1) / (total - 1)) * 100)
  const currentTitle = steps.find((step) => step.index === current)?.title ?? ''

  return (
    <div>
      {/* Mobile */}
      <div className="sm:hidden">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-medium">{currentTitle}</p>
          <p className="text-sm text-ink-muted">
            {current} of {total}
          </p>
        </div>
        <div
          className="mt-3 h-0.5 w-full bg-line"
          role="progressbar"
          aria-valuenow={current}
          aria-valuemin={1}
          aria-valuemax={total}
          aria-label={`Step ${current} of ${total}: ${currentTitle}`}
        >
          <div
            className="h-full bg-ink transition-all duration-500"
            style={{ width: `${Math.max(percent, 4)}%` }}
          />
        </div>
      </div>

      {/* Desktop */}
      <ol className="hidden items-center sm:flex">
        {steps.map((step, position) => {
          const isComplete = step.index < current
          const isCurrent = step.index === current

          return (
            <li key={step.index} className={cn('flex items-center', position > 0 && 'flex-1')}>
              {position > 0 ? (
                <span
                  aria-hidden
                  className={cn(
                    'mx-2 h-px flex-1 transition-colors duration-500',
                    isComplete || isCurrent ? 'bg-ink' : 'bg-line',
                  )}
                />
              ) : null}

              <span className="flex items-center gap-2.5">
                <span
                  className={cn(
                    'flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-medium transition-colors duration-300',
                    isComplete && 'border-ink bg-ink text-ink-inverse',
                    isCurrent && 'border-ink text-ink',
                    !isComplete && !isCurrent && 'border-line-strong text-ink-muted',
                  )}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {isComplete ? '✓' : step.index}
                </span>
                <span
                  className={cn(
                    'hidden text-sm transition-colors duration-300 lg:inline',
                    isCurrent ? 'font-medium text-ink' : 'text-ink-muted',
                  )}
                >
                  {step.title}
                </span>
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
