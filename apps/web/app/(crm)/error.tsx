'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/ui/states'

/**
 * CRM error boundary. A failed query shows this instead of a blank screen.
 * The raw error is never rendered — it routinely contains connection strings
 * and row contents.
 */
export default function CrmError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('CRM route error', error)
  }, [error])

  return (
    <ErrorState
      title="This page could not load"
      description={
        error.digest
          ? `Please try again. If it keeps happening, quote reference ${error.digest}.`
          : 'Please try again in a moment.'
      }
      action={<Button onClick={reset}>Try again</Button>}
    />
  )
}
