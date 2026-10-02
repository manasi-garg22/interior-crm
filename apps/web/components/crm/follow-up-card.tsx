'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { TextArea, TextInput } from '@/components/ui/field'
import { Badge, TemperatureBadge, titleCase } from '@/components/ui/badge'
import {
  cancelFollowUpAction,
  completeFollowUpAction,
  rescheduleFollowUpAction,
} from '@/app/(crm)/follow-ups/actions'

export type FollowUpCardData = {
  id: string
  type: string
  status: string
  scheduledAt: string
  notes: string | null
  outcome: string | null
  isOverdue: boolean
  assignedToName: string
  lead: {
    id: string
    leadNumber: string
    temperature: string
    customerName: string
    customerPhone: string
    city: string | null
  }
}

type Mode = 'idle' | 'complete' | 'reschedule' | 'cancel'

export function FollowUpCard({ followUp }: { followUp: FollowUpCardData }) {
  const [mode, setMode] = useState<Mode>('idle')
  const [outcome, setOutcome] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const closed = followUp.status !== 'PENDING'

  function run(work: () => Promise<{ ok: boolean; error?: string }>): void {
    setError(null)
    startTransition(async () => {
      const result = await work()
      if (result.ok) setMode('idle')
      else setError(result.error ?? 'That did not work.')
    })
  }

  return (
    <li
      className={
        followUp.isOverdue
          ? 'border-l-2 border-l-danger border border-line bg-surface p-4 sm:p-5'
          : 'border border-line bg-surface p-4 sm:p-5'
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/leads/${followUp.lead.id}`}
            className="font-medium underline-offset-4 hover:underline"
          >
            {followUp.lead.customerName}
          </Link>
          <p className="mt-0.5 font-mono text-xs text-ink-muted">{followUp.lead.leadNumber}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={followUp.isOverdue ? 'danger' : 'neutral'}>
            {titleCase(followUp.type)}
          </Badge>
          <TemperatureBadge temperature={followUp.lead.temperature} />
          {closed ? <Badge tone="neutral">{titleCase(followUp.status)}</Badge> : null}
        </div>
      </div>

      <p className={followUp.isOverdue ? 'mt-3 text-sm font-medium text-danger' : 'mt-3 text-sm'}>
        {followUp.scheduledAt}
        {followUp.isOverdue ? ' · overdue' : ''}
      </p>

      {followUp.notes ? (
        <p className="mt-2 whitespace-pre-wrap text-sm text-ink-soft">{followUp.notes}</p>
      ) : null}
      {followUp.outcome ? (
        <p className="mt-2 text-sm text-ink-muted">Outcome: {followUp.outcome}</p>
      ) : null}

      <p className="mt-2 text-xs text-ink-muted">
        {followUp.assignedToName}
        {followUp.lead.city ? ` · ${followUp.lead.city}` : ''}
      </p>

      {error ? (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {closed ? null : (
        <div className="mt-4">
          {mode === 'idle' ? (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => setMode('complete')}>
                Mark done
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setMode('reschedule')}>
                Reschedule
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setMode('cancel')}>
                Cancel
              </Button>
              <a
                href={`tel:${followUp.lead.customerPhone}`}
                className="inline-flex h-9 items-center px-3 text-sm text-ink-soft hover:text-ink"
              >
                Call
              </a>
            </div>
          ) : null}

          {mode === 'complete' ? (
            <div className="space-y-3">
              <TextArea
                aria-label="What happened?"
                value={outcome}
                onChange={(event) => setOutcome(event.target.value)}
                placeholder="What happened on the call?"
                className="min-h-20"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={pending || outcome.trim().length === 0}
                  onClick={() =>
                    run(() => completeFollowUpAction({ followUpId: followUp.id, outcome }))
                  }
                >
                  Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setMode('idle')}>
                  Back
                </Button>
              </div>
            </div>
          ) : null}

          {mode === 'reschedule' ? (
            <div className="space-y-3">
              <TextInput
                type="datetime-local"
                aria-label="New date and time"
                value={scheduledAt}
                onChange={(event) => setScheduledAt(event.target.value)}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={pending || !scheduledAt}
                  onClick={() =>
                    run(() =>
                      rescheduleFollowUpAction({ followUpId: followUp.id, scheduledAt }),
                    )
                  }
                >
                  Move it
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setMode('idle')}>
                  Back
                </Button>
              </div>
            </div>
          ) : null}

          {mode === 'cancel' ? (
            <div className="space-y-3">
              <TextInput
                aria-label="Reason"
                value={outcome}
                onChange={(event) => setOutcome(event.target.value)}
                placeholder="Why is it being cancelled? (optional)"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="danger"
                  disabled={pending}
                  onClick={() =>
                    run(() =>
                      cancelFollowUpAction({
                        followUpId: followUp.id,
                        reason: outcome || undefined,
                      }),
                    )
                  }
                >
                  Cancel follow-up
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setMode('idle')}>
                  Back
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </li>
  )
}
