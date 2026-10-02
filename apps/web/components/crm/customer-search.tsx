'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { TextInput } from '@/components/ui/field'

export function CustomerSearch({ initialQuery }: { initialQuery: string }) {
  const router = useRouter()
  const [query, setQuery] = useState(initialQuery)
  const [pending, startTransition] = useTransition()

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        const target = query.trim() ? `/customers?q=${encodeURIComponent(query.trim())}` : '/customers'
        startTransition(() => router.push(target))
      }}
      className="mb-6 flex gap-2"
    >
      <TextInput
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search by name, phone or email"
        aria-label="Search customers"
        className="flex-1"
      />
      <Button type="submit" disabled={pending}>
        Search
      </Button>
      {initialQuery ? (
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setQuery('')
            startTransition(() => router.push('/customers'))
          }}
        >
          Clear
        </Button>
      ) : null}
    </form>
  )
}
