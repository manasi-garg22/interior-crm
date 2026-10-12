'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Field, SelectInput, TextArea, TextInput } from '@/components/ui/field'
import { titleCase } from '@/components/ui/badge'
import { localInputToIso } from '@/lib/time'
import { formatInr } from '@/lib/estimate/types'
import { parseAmount } from '@/lib/view/amount'
import {
  addNoteAction,
  assignLeadAction,
  changeStatusAction,
  scheduleFollowUpAction,
  updateWonValueAction,
} from '@/app/(crm)/leads/[id]/actions'

const STATUSES = [
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'CONSULTATION',
  'SITE_VISIT',
  'QUOTATION',
  'DESIGN',
  'NEGOTIATION',
  'WON',
  'LOST',
  'ON_HOLD',
]

type Assignee = { id: string; name: string }

export function LeadActionPanel({
  leadId,
  currentStatus,
  currentAssigneeId,
  assignees,
  wonValue,
  permissions,
}: {
  leadId: string
  currentStatus: string
  currentAssigneeId: string | null
  assignees: Assignee[]
  /** The locked deal value, if one has been set. */
  wonValue: number | null
  permissions: {
    canAssign: boolean
    canUpdate: boolean
    canCreateFollowUp: boolean
    canEditWonValue: boolean
  }
}) {
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)

  function run(work: () => Promise<{ ok: boolean; error?: string }>, success: string): void {
    startTransition(async () => {
      const result = await work()
      setMessage(
        result.ok
          ? { tone: 'ok', text: success }
          : { tone: 'error', text: result.error ?? 'Failed' },
      )
    })
  }

  return (
    <div className="space-y-6">
      {message ? (
        <div
          role="status"
          className={
            message.tone === 'ok'
              ? 'border border-success/30 bg-success-soft px-4 py-3 text-sm text-success'
              : 'border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger'
          }
        >
          {message.text}
        </div>
      ) : null}

      {permissions.canEditWonValue && (currentStatus === 'WON' || wonValue != null) ? (
        <WonValueForm leadId={leadId} wonValue={wonValue} pending={pending} onSubmit={run} />
      ) : null}

      {permissions.canUpdate ? (
        <StatusForm
          leadId={leadId}
          currentStatus={currentStatus}
          wonValue={wonValue}
          pending={pending}
          onSubmit={run}
        />
      ) : null}

      {permissions.canAssign ? (
        <AssignForm
          leadId={leadId}
          currentAssigneeId={currentAssigneeId}
          assignees={assignees}
          pending={pending}
          onSubmit={run}
        />
      ) : null}

      {permissions.canUpdate ? <NoteForm leadId={leadId} pending={pending} onSubmit={run} /> : null}

      {permissions.canCreateFollowUp ? (
        <FollowUpForm
          leadId={leadId}
          assignees={assignees}
          defaultAssigneeId={currentAssigneeId}
          pending={pending}
          onSubmit={run}
        />
      ) : null}
    </div>
  )
}

type Runner = (work: () => Promise<{ ok: boolean; error?: string }>, success: string) => void

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border border-line bg-surface p-5">
      <p className="eyebrow">{title}</p>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  )
}

function StatusForm({
  leadId,
  currentStatus,
  wonValue,
  pending,
  onSubmit,
}: {
  leadId: string
  currentStatus: string
  wonValue: number | null
  pending: boolean
  onSubmit: Runner
}) {
  const [status, setStatus] = useState(currentStatus)
  const [note, setNote] = useState('')
  const [lostReason, setLostReason] = useState('')
  const [amount, setAmount] = useState('')

  const needsAmount = status === 'WON' && wonValue == null
  const parsedAmount = parseAmount(amount)

  return (
    <Panel title="Change status">
      <SelectInput
        aria-label="New status"
        value={status}
        onChange={(event) => setStatus(event.target.value)}
      >
        {STATUSES.map((option) => (
          <option key={option} value={option}>
            {titleCase(option)}
          </option>
        ))}
      </SelectInput>

      {status === 'LOST' ? (
        <Field label="Why was it lost?" required>
          {(field) => (
            <TextInput
              {...field}
              value={lostReason}
              onChange={(event) => setLostReason(event.target.value)}
              placeholder="Budget mismatch"
            />
          )}
        </Field>
      ) : null}

      {needsAmount ? (
        <Field
          label="Final deal amount (₹)"
          required
          error={amount && parsedAmount == null ? 'Enter an amount like 12,50,000' : undefined}
          hint={
            parsedAmount != null
              ? `${formatInr(parsedAmount)} · locked once saved, only an admin can change it`
              : 'Locked once saved, only an admin can change it'
          }
        >
          {(field) => (
            <TextInput
              {...field}
              inputMode="decimal"
              autoComplete="off"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="12,50,000"
            />
          )}
        </Field>
      ) : status === 'WON' && wonValue != null ? (
        <p className="text-sm text-ink-muted">
          Deal value {formatInr(wonValue)} is already locked and will be kept.
        </p>
      ) : null}

      <TextArea
        aria-label="Note"
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Optional note for the timeline"
        className="min-h-20"
      />

      <Button
        disabled={pending || status === currentStatus || (needsAmount && parsedAmount == null)}
        onClick={() => {
          if (
            needsAmount &&
            parsedAmount != null &&
            !window.confirm(
              `Mark as won for ${formatInr(parsedAmount)}? The amount will be locked.`,
            )
          ) {
            return
          }
          onSubmit(async () => {
            const result = await changeStatusAction({
              leadId,
              status,
              note: note || undefined,
              lostReason: lostReason || undefined,
              wonValue: needsAmount && parsedAmount != null ? parsedAmount : undefined,
            })
            if (result.ok) setAmount('')
            return result
          }, 'Status updated.')
        }}
      >
        Update status
      </Button>
    </Panel>
  )
}

/** Admin-only: change a locked deal value, with a reason for the audit trail. */
function WonValueForm({
  leadId,
  wonValue,
  pending,
  onSubmit,
}: {
  leadId: string
  wonValue: number | null
  pending: boolean
  onSubmit: Runner
}) {
  const [editing, setEditing] = useState(wonValue == null)
  const [amount, setAmount] = useState(wonValue != null ? String(wonValue) : '')
  const [reason, setReason] = useState('')
  const parsedAmount = parseAmount(amount)

  if (!editing) {
    return (
      <Panel title="Deal value">
        <p className="text-sm text-ink-soft">
          {wonValue != null ? `${formatInr(wonValue)} · locked` : 'Not set'}
        </p>
        <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
          Change amount
        </Button>
      </Panel>
    )
  }

  return (
    <Panel title={wonValue == null ? 'Set deal value' : 'Change deal value'}>
      <Field
        label="Amount (₹)"
        required
        error={amount && parsedAmount == null ? 'Enter an amount like 12,50,000' : undefined}
        hint={parsedAmount != null ? formatInr(parsedAmount) : undefined}
      >
        {(field) => (
          <TextInput
            {...field}
            inputMode="decimal"
            autoComplete="off"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        )}
      </Field>
      <Field label="Reason" required>
        {(field) => (
          <TextInput
            {...field}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Scope reduced after final measurement"
          />
        )}
      </Field>
      <div className="flex gap-2">
        <Button
          disabled={pending || parsedAmount == null || reason.trim().length < 3}
          onClick={() =>
            onSubmit(async () => {
              const result = await updateWonValueAction({
                leadId,
                wonValue: parsedAmount ?? 0,
                reason,
              })
              if (result.ok) {
                setReason('')
                setEditing(false)
              }
              return result
            }, 'Deal value updated.')
          }
        >
          Save amount
        </Button>
        {wonValue != null ? (
          <Button variant="ghost" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        ) : null}
      </div>
    </Panel>
  )
}

function AssignForm({
  leadId,
  currentAssigneeId,
  assignees,
  pending,
  onSubmit,
}: {
  leadId: string
  currentAssigneeId: string | null
  assignees: Assignee[]
  pending: boolean
  onSubmit: Runner
}) {
  const [assignedToId, setAssignedToId] = useState(currentAssigneeId ?? '')

  return (
    <Panel title="Assign">
      <SelectInput
        aria-label="Assign to"
        value={assignedToId}
        onChange={(event) => setAssignedToId(event.target.value)}
      >
        <option value="">Unassigned</option>
        {assignees.map((person) => (
          <option key={person.id} value={person.id}>
            {person.name}
          </option>
        ))}
      </SelectInput>

      <Button
        variant="secondary"
        disabled={pending}
        onClick={() =>
          onSubmit(
            () => assignLeadAction({ leadId, assignedToId: assignedToId || null }),
            'Lead reassigned.',
          )
        }
      >
        Save assignment
      </Button>
    </Panel>
  )
}

function NoteForm({
  leadId,
  pending,
  onSubmit,
}: {
  leadId: string
  pending: boolean
  onSubmit: Runner
}) {
  const [note, setNote] = useState('')

  return (
    <Panel title="Add a note">
      <TextArea
        aria-label="Note"
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Spoke to the customer about…"
      />
      <Button
        variant="secondary"
        disabled={pending || note.trim().length === 0}
        onClick={() =>
          onSubmit(async () => {
            const result = await addNoteAction({ leadId, note })
            if (result.ok) setNote('')
            return result
          }, 'Note added.')
        }
      >
        Add note
      </Button>
    </Panel>
  )
}

function FollowUpForm({
  leadId,
  assignees,
  defaultAssigneeId,
  pending,
  onSubmit,
}: {
  leadId: string
  assignees: Assignee[]
  defaultAssigneeId: string | null
  pending: boolean
  onSubmit: Runner
}) {
  const [assignedToId, setAssignedToId] = useState(defaultAssigneeId ?? assignees[0]?.id ?? '')
  const [type, setType] = useState('CALL')
  const [scheduledAt, setScheduledAt] = useState('')
  const [notes, setNotes] = useState('')

  return (
    <Panel title="Schedule a follow-up">
      <SelectInput
        aria-label="Follow-up type"
        value={type}
        onChange={(event) => setType(event.target.value)}
      >
        {['CALL', 'WHATSAPP', 'EMAIL', 'MEETING', 'SITE_VISIT'].map((option) => (
          <option key={option} value={option}>
            {titleCase(option)}
          </option>
        ))}
      </SelectInput>

      <TextInput
        type="datetime-local"
        aria-label="When"
        value={scheduledAt}
        onChange={(event) => setScheduledAt(event.target.value)}
      />

      <SelectInput
        aria-label="Owner"
        value={assignedToId}
        onChange={(event) => setAssignedToId(event.target.value)}
      >
        {assignees.map((person) => (
          <option key={person.id} value={person.id}>
            {person.name}
          </option>
        ))}
      </SelectInput>

      <TextArea
        aria-label="Follow-up notes"
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        placeholder="Optional"
        className="min-h-20"
      />

      <Button
        variant="secondary"
        disabled={pending || !scheduledAt || !assignedToId}
        onClick={() =>
          onSubmit(async () => {
            const result = await scheduleFollowUpAction({
              leadId,
              assignedToId,
              type,
              // Attach the browser's timezone; the UTC server cannot infer it.
              scheduledAt: localInputToIso(scheduledAt),
              notes: notes || undefined,
            })
            if (result.ok) {
              setScheduledAt('')
              setNotes('')
            }
            return result
          }, 'Follow-up scheduled.')
        }
      >
        Schedule
      </Button>
    </Panel>
  )
}
