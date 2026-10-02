'use client'

import { cn } from '@/lib/utils/cn'

/**
 * Selection controls for the public form.
 *
 * The brief is explicit: buttons and chips instead of typing, and mobile
 * first. These render as real radio/checkbox inputs underneath so keyboard
 * navigation, screen readers and native form semantics all work — the card
 * is only a label wrapping the input.
 *
 * Touch targets are at least 44px tall throughout.
 */

export function ChoiceCard({
  name,
  value,
  checked,
  onSelect,
  title,
  description,
}: {
  name: string
  value: string
  checked: boolean
  onSelect: (value: string) => void
  title: string
  description?: string
}) {
  return (
    <label
      className={cn(
        'group relative flex cursor-pointer flex-col justify-center gap-1 rounded-[2px] border p-4 transition-all duration-200 sm:p-5',
        'min-h-[4.5rem] has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent',
        checked
          ? 'border-ink bg-ink text-ink-inverse'
          : 'border-line-strong bg-surface text-ink hover:border-ink-muted',
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={() => onSelect(value)}
        className="sr-only"
      />
      <span className="text-[0.9375rem] font-medium leading-snug">{title}</span>
      {description ? (
        <span className={cn('text-sm', checked ? 'text-ink-inverse/70' : 'text-ink-muted')}>
          {description}
        </span>
      ) : null}
    </label>
  )
}

export function ChipToggle({
  value,
  checked,
  onToggle,
  label,
}: {
  value: string
  checked: boolean
  onToggle: (value: string) => void
  label: string
}) {
  return (
    <label
      className={cn(
        'inline-flex min-h-11 cursor-pointer items-center rounded-full border px-4 py-2 text-sm transition-colors duration-200',
        'has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent',
        checked
          ? 'border-ink bg-ink text-ink-inverse'
          : 'border-line-strong bg-surface text-ink-soft hover:border-ink-muted hover:text-ink',
      )}
    >
      <input
        type="checkbox"
        value={value}
        checked={checked}
        onChange={() => onToggle(value)}
        className="sr-only"
      />
      {label}
    </label>
  )
}

export function ChoiceGrid({
  columns = 2,
  children,
}: {
  columns?: 1 | 2 | 3
  children: React.ReactNode
}) {
  const columnClass =
    columns === 1 ? 'sm:grid-cols-1' : columns === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'
  // Single column on phones regardless — most traffic arrives from Instagram.
  return <div className={cn('grid grid-cols-1 gap-3', columnClass)}>{children}</div>
}

export function ChipGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-2.5">{children}</div>
}
