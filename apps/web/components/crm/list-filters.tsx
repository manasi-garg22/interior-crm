'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { SelectInput, TextInput } from '@/components/ui/field'
import { cn } from '@/lib/utils/cn'

import type { FilterField, FilterOption } from '@/lib/view/list-filters'

export type { FilterField, FilterOption }

/**
 * A generic filter bar for the CRM lists.
 *
 * State lives in the URL, never in the component, so every filtered view is
 * a shareable link and the back button behaves. Selects, dates and toggles
 * apply immediately; free-text fields apply on Enter or the Search button.
 * Multi-selects are stored comma-separated (`?status=NEW,CONTACTED`).
 */
export function ListFilters({
  basePath,
  searchPlaceholder,
  fields,
  /** Keys that are not filters (e.g. a queue tab) and survive "Clear filters". */
  preserveKeys = [],
}: {
  basePath: string
  searchPlaceholder: string
  fields: FilterField[]
  preserveKeys?: string[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()

  const textKeys = [
    'q',
    ...fields.filter((field) => field.kind === 'text').map((field) => field.key),
  ]
  const [texts, setTexts] = useState<Record<string, string>>(() =>
    Object.fromEntries(textKeys.map((key) => [key, searchParams.get(key) ?? ''])),
  )

  function push(params: URLSearchParams): void {
    // Any filter change invalidates the current page number.
    params.delete('page')
    const query = params.toString()
    startTransition(() => router.push(query ? `${basePath}?${query}` : basePath))
  }

  function apply(changes: Record<string, string>): void {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(changes)) {
      if (value.trim()) params.set(key, value.trim())
      else params.delete(key)
    }
    push(params)
  }

  function clearAll(): void {
    const params = new URLSearchParams()
    for (const key of preserveKeys) {
      const value = searchParams.get(key)
      if (value) params.set(key, value)
    }
    setTexts(Object.fromEntries(textKeys.map((key) => [key, ''])))
    push(params)
  }

  const filterKeys = ['q', ...fields.map((field) => field.key)]
  const activeCount = filterKeys.filter((key) => searchParams.get(key)).length

  return (
    <div className={cn('mb-6 space-y-3', pending && 'opacity-80')}>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          apply(texts)
        }}
        className="flex flex-wrap gap-2"
      >
        {/* TextInput/SelectInput are w-full; wrappers set the width (cn does not merge classes). */}
        <div className="min-w-56 flex-1">
          <TextInput
            value={texts.q ?? ''}
            onChange={(event) => setTexts((current) => ({ ...current, q: event.target.value }))}
            placeholder={searchPlaceholder}
            aria-label="Search"
            type="search"
            className="h-10 text-sm"
          />
        </div>
        {fields
          .filter((field) => field.kind === 'text')
          .map((field) => (
            <div key={field.key} className="w-40">
              <TextInput
                value={texts[field.key] ?? ''}
                onChange={(event) =>
                  setTexts((current) => ({ ...current, [field.key]: event.target.value }))
                }
                placeholder={field.placeholder ?? field.label}
                aria-label={field.label}
                className="h-10 text-sm"
              />
            </div>
          ))}
        <Button type="submit" size="sm" disabled={pending} className="h-10">
          Search
        </Button>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        {fields.map((field) => {
          const value = searchParams.get(field.key) ?? ''

          switch (field.kind) {
            case 'select':
              return (
                <div key={field.key} className="w-44">
                  <SelectInput
                    aria-label={field.label}
                    value={value}
                    onChange={(event) => apply({ [field.key]: event.target.value })}
                    className={cn('h-10 text-sm', value && 'font-medium')}
                  >
                    <option value="">{field.anyLabel ?? `${field.label}: any`}</option>
                    {field.options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </SelectInput>
                </div>
              )

            case 'multi':
              return (
                <MultiSelect
                  key={field.key}
                  label={field.label}
                  options={field.options}
                  selected={value ? value.split(',') : []}
                  onChange={(next) => apply({ [field.key]: next.join(',') })}
                />
              )

            case 'date':
            case 'month':
              return (
                <label
                  key={field.key}
                  className={cn(
                    'flex h-10 items-center gap-2 rounded-[2px] border bg-surface px-3 text-sm text-ink-soft',
                    value ? 'border-ink' : 'border-line-strong',
                  )}
                >
                  {field.label}
                  <input
                    type={field.kind}
                    value={value}
                    onChange={(event) => apply({ [field.key]: event.target.value })}
                    className="bg-transparent text-ink focus:outline-none"
                  />
                </label>
              )

            case 'toggle':
              return (
                <label
                  key={field.key}
                  className={cn(
                    'flex h-10 cursor-pointer items-center gap-2 rounded-[2px] border bg-surface px-3 text-sm',
                    value ? 'border-ink text-ink' : 'border-line-strong text-ink-soft',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={value === '1'}
                    onChange={(event) => apply({ [field.key]: event.target.checked ? '1' : '' })}
                    className="size-4 accent-current"
                  />
                  {field.label}
                </label>
              )

            case 'text':
              return null
          }
        })}

        {activeCount > 0 ? (
          <Button variant="ghost" size="sm" onClick={clearAll} disabled={pending}>
            Clear filters ({activeCount})
          </Button>
        ) : null}
      </div>
    </div>
  )
}

function MultiSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string
  options: FilterOption[]
  selected: string[]
  onChange: (next: string[]) => void
}) {
  const ref = useRef<HTMLDetailsElement>(null)

  // <details> does not close on an outside click by itself.
  useEffect(() => {
    function onPointerDown(event: PointerEvent): void {
      const node = ref.current
      if (node?.open && !node.contains(event.target as Node)) node.open = false
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  const summary =
    selected.length === 0
      ? `${label}: any`
      : selected.length === 1
        ? `${label}: ${options.find((option) => option.value === selected[0])?.label ?? selected[0]}`
        : `${label}: ${selected.length} selected`

  return (
    <details ref={ref} className="relative">
      <summary
        className={cn(
          'flex h-10 cursor-pointer list-none items-center gap-2 rounded-[2px] border bg-surface px-3.5 text-sm [&::-webkit-details-marker]:hidden',
          selected.length ? 'border-ink text-ink' : 'border-line-strong text-ink',
        )}
      >
        {summary}
        <span aria-hidden className="text-xs text-ink-muted">
          ▾
        </span>
      </summary>

      <fieldset className="absolute left-0 z-20 mt-1 max-h-72 w-56 overflow-y-auto rounded-[2px] border border-line-strong bg-surface p-2 shadow-lg">
        <legend className="sr-only">{label}</legend>
        {options.map((option) => {
          const checked = selected.includes(option.value)
          return (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-2 rounded-[2px] px-2 py-1.5 text-sm hover:bg-surface-sunken"
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() =>
                  onChange(
                    checked
                      ? selected.filter((item) => item !== option.value)
                      : [...selected, option.value],
                  )
                }
                className="size-4"
              />
              {option.label}
            </label>
          )
        })}
        {selected.length > 0 ? (
          <button
            type="button"
            onClick={() => onChange([])}
            className="mt-1 w-full px-2 py-1.5 text-left text-xs text-ink-muted underline underline-offset-2"
          >
            Clear {label.toLowerCase()}
          </button>
        ) : null}
      </fieldset>
    </details>
  )
}
