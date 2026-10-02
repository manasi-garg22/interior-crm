'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { SelectInput, TextInput } from '@/components/ui/field'
import { titleCase } from '@/components/ui/badge'

const STATUSES = [
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'CONSULTATION',
  'SITE_VISIT',
  'DESIGN',
  'QUOTATION',
  'NEGOTIATION',
  'WON',
  'LOST',
  'ON_HOLD',
]
const TEMPERATURES = ['HOT', 'WARM', 'COLD']
const SOURCES = [
  'INSTAGRAM',
  'FACEBOOK',
  'GOOGLE',
  'WEBSITE',
  'WHATSAPP',
  'REFERRAL',
  'DIRECT',
  'OTHER',
]

/**
 * Filters write to the URL rather than to component state, so every view is
 * a shareable link and the back button behaves the way people expect.
 */
export function LeadFilters({
  assignees,
  canFilterByAssignee,
}: {
  assignees: { id: string; name: string }[]
  canFilterByAssignee: boolean
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()
  const [query, setQuery] = useState(searchParams.get('q') ?? '')

  function apply(changes: Record<string, string>): void {
    const params = new URLSearchParams(searchParams.toString())

    for (const [key, value] of Object.entries(changes)) {
      if (value) params.set(key, value)
      else params.delete(key)
    }
    // Any filter change invalidates the current page number.
    params.delete('page')

    startTransition(() => router.push(`/leads?${params.toString()}`))
  }

  const activeCount = ['status', 'temperature', 'source', 'assignedToId', 'overdue'].filter((key) =>
    searchParams.get(key),
  ).length

  return (
    <div className="mb-6 space-y-3">
      <form
        onSubmit={(event) => {
          event.preventDefault()
          apply({ q: query })
        }}
        className="flex gap-2"
      >
        <TextInput
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search name, phone, email or lead number"
          aria-label="Search leads"
          className="flex-1"
        />
        <Button type="submit" disabled={pending}>
          Search
        </Button>
      </form>

      <div className="flex flex-wrap gap-2">
        <FilterSelect
          label="Status"
          value={searchParams.get('status') ?? ''}
          options={STATUSES}
          onChange={(value) => apply({ status: value })}
        />
        <FilterSelect
          label="Temperature"
          value={searchParams.get('temperature') ?? ''}
          options={TEMPERATURES}
          onChange={(value) => apply({ temperature: value })}
        />
        <FilterSelect
          label="Source"
          value={searchParams.get('source') ?? ''}
          options={SOURCES}
          onChange={(value) => apply({ source: value })}
        />

        {canFilterByAssignee ? (
          <SelectInput
            aria-label="Assigned to"
            value={searchParams.get('assignedToId') ?? ''}
            onChange={(event) => apply({ assignedToId: event.target.value })}
            className="h-10 w-auto min-w-40 text-sm"
          >
            <option value="">Anyone</option>
            <option value="unassigned">Unassigned</option>
            {assignees.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </SelectInput>
        ) : null}

        {activeCount > 0 ? (
          <Button variant="ghost" size="sm" onClick={() => startTransition(() => router.push('/leads'))}>
            Clear filters
          </Button>
        ) : null}
      </div>
    </div>
  )
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
}) {
  return (
    <SelectInput
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 w-auto min-w-36 text-sm"
    >
      <option value="">{label}: any</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {titleCase(option)}
        </option>
      ))}
    </SelectInput>
  )
}
