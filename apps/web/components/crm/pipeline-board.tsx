'use client'

import { useOptimistic, useState, useTransition } from 'react'
import Link from 'next/link'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { TemperatureBadge, titleCase } from '@/components/ui/badge'
import { SelectInput } from '@/components/ui/field'
import { cn } from '@/lib/utils/cn'
import { findCard, findColumnOf, moveCard } from '@/lib/view/pipeline-move'
import { changeStatusAction } from '@/app/(crm)/leads/[id]/actions'

type Card = {
  id: string
  leadNumber: string
  customerName: string
  city: string | null
  temperature: string
  score: number
  assigneeName: string | null
  budgetLabel: string | null
}

type Column = { status: string; total: number; cards: Card[] }

/**
 * Pipeline Kanban.
 *
 * Drag-and-drop is the fast path, but it is not the only path: every card
 * also carries a status <select>, because pointer dragging is awkward on a
 * phone and impossible for anyone using a screen reader. dnd-kit's keyboard
 * sensor covers keyboard users on desktop.
 *
 * Moves are optimistic — the card jumps immediately and rolls back if the
 * server rejects it, rather than making a salesperson wait on a round trip.
 */
export function PipelineBoard({ columns }: { columns: Column[] }) {
  const [pending, startTransition] = useTransition()
  const [activeCard, setActiveCard] = useState<Card | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [optimisticColumns, applyMove] = useOptimistic(
    columns,
    (current: Column[], move: { cardId: string; toStatus: string }) =>
      moveCard(current, move.cardId, move.toStatus),
  )

  const sensors = useSensors(
    // A small distance threshold keeps a click on the card link from being
    // swallowed as the start of a drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  )

  function commit(cardId: string, toStatus: string, fromStatus: string): void {
    if (toStatus === fromStatus) return

    setError(null)
    startTransition(async () => {
      applyMove({ cardId, toStatus })

      const result = await changeStatusAction({ leadId: cardId, status: toStatus })
      if (!result.ok) {
        // The optimistic state unwinds on its own when the transition ends
        // without a matching server render.
        setError(result.error ?? 'Could not move that lead.')
      }
    })
  }

  function handleDragStart(event: DragStartEvent): void {
    const card = findCard(optimisticColumns, String(event.active.id))
    setActiveCard(card)
  }

  function handleDragEnd(event: DragEndEvent): void {
    setActiveCard(null)
    const { active, over } = event
    if (!over) return

    const cardId = String(active.id)
    const toStatus = String(over.id)
    const fromStatus = findColumnOf(optimisticColumns, cardId)
    if (fromStatus) commit(cardId, toStatus, fromStatus)
  }

  return (
    <div>
      {error ? (
        <div
          role="alert"
          className="mb-4 border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger"
        >
          {error}
        </div>
      ) : null}

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveCard(null)}
      >
        <div className={cn('flex gap-4 overflow-x-auto pb-4', pending && 'opacity-90')}>
          {optimisticColumns.map((column) => (
            <PipelineColumn
              key={column.status}
              column={column}
              allStatuses={optimisticColumns.map((c) => c.status)}
              onMove={commit}
            />
          ))}
        </div>

        <DragOverlay>
          {activeCard ? <CardBody card={activeCard} dragging /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}

function PipelineColumn({
  column,
  allStatuses,
  onMove,
}: {
  column: Column
  allStatuses: string[]
  onMove: (cardId: string, toStatus: string, fromStatus: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.status })

  return (
    <section
      ref={setNodeRef}
      className={cn(
        'flex w-72 shrink-0 flex-col rounded-[2px] border bg-surface-sunken/60 transition-colors',
        isOver ? 'border-ink bg-accent-soft/40' : 'border-line',
      )}
      aria-label={`${titleCase(column.status)} column`}
    >
      <header className="flex items-baseline justify-between border-b border-line px-3 py-3">
        <h2 className="text-sm font-medium">{titleCase(column.status)}</h2>
        <span className="text-xs tabular-nums text-ink-muted">{column.total}</span>
      </header>

      <div className="flex-1 space-y-2 p-2">
        {column.cards.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-ink-muted">Nothing here</p>
        ) : (
          column.cards.map((card) => (
            <DraggableCard
              key={card.id}
              card={card}
              status={column.status}
              allStatuses={allStatuses}
              onMove={onMove}
            />
          ))
        )}

        {column.total > column.cards.length ? (
          <p className="px-2 py-2 text-center text-xs text-ink-muted">
            Showing {column.cards.length} of {column.total} —{' '}
            <Link href={`/leads?status=${column.status}`} className="underline underline-offset-2">
              see all
            </Link>
          </p>
        ) : null}
      </div>
    </section>
  )
}

function DraggableCard({
  card,
  status,
  allStatuses,
  onMove,
}: {
  card: Card
  status: string
  allStatuses: string[]
  onMove: (cardId: string, toStatus: string, fromStatus: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: card.id })

  return (
    <div
      ref={setNodeRef}
      style={transform ? { transform: CSS.Translate.toString(transform) } : undefined}
      className={isDragging ? 'opacity-40' : undefined}
    >
      <CardBody
        card={card}
        handleProps={{ ...listeners, ...attributes }}
        statusControl={
          <SelectInput
            aria-label={`Move ${card.customerName} to another stage`}
            value={status}
            onChange={(event) => onMove(card.id, event.target.value, status)}
            className="h-8 w-full text-xs"
            // Stops a click on the select from starting a drag.
            onPointerDown={(event) => event.stopPropagation()}
          >
            {allStatuses.map((option) => (
              <option key={option} value={option}>
                {titleCase(option)}
              </option>
            ))}
          </SelectInput>
        }
      />
    </div>
  )
}

function CardBody({
  card,
  handleProps,
  statusControl,
  dragging,
}: {
  card: Card
  handleProps?: Record<string, unknown>
  statusControl?: React.ReactNode
  dragging?: boolean
}) {
  return (
    <article
      className={cn(
        'rounded-[2px] border border-line bg-surface p-3',
        dragging && 'shadow-lg ring-1 ring-ink/10',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        {/* Only the grip drags, so the title stays a working link. */}
        <span
          {...handleProps}
          className="cursor-grab select-none text-ink-muted active:cursor-grabbing"
          aria-hidden={handleProps ? undefined : true}
        >
          ⠿
        </span>
        <TemperatureBadge temperature={card.temperature} />
      </div>

      <Link
        href={`/leads/${card.id}`}
        className="mt-1.5 block truncate text-sm font-medium underline-offset-4 hover:underline"
      >
        {card.customerName}
      </Link>
      <p className="font-mono text-[0.6875rem] text-ink-muted">{card.leadNumber}</p>

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
        {card.budgetLabel ? <span>{card.budgetLabel}</span> : null}
        {card.city ? <span>· {card.city}</span> : null}
        <span>· {card.score}</span>
      </div>

      {card.assigneeName ? (
        <p className="mt-1 truncate text-xs text-ink-muted">{card.assigneeName}</p>
      ) : (
        <p className="mt-1 text-xs text-accent">Unassigned</p>
      )}

      {statusControl ? <div className="mt-2.5">{statusControl}</div> : null}
    </article>
  )
}

// findCard, findColumnOf and moveCard live in lib/view/pipeline-move so the
// total-adjusting logic can be unit tested away from the DOM. They sit in
// lib/view rather than lib/modules because they are presentation logic, not
// a domain service — components are barred from importing the latter.
