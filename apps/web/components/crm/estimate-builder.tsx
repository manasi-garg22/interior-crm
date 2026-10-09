'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field, TextArea, TextInput } from '@/components/ui/field'
import { cn } from '@/lib/utils/cn'
import {
  ROOM_TYPES,
  UNITS,
  formatInr,
  grandTotal,
  groupByRoom,
  lineTotal,
  type Estimate,
  type EstimateItem,
} from '@/lib/estimate/types'

const STORAGE_KEY = 'oma:estimate-draft'

const EMPTY: Estimate = { clientName: '', date: '', remarks: '', items: [] }

type ItemDraft = { roomType: string; name: string; quantity: string; unit: string; price: string }

const BLANK_DRAFT: ItemDraft = { roomType: '', name: '', quantity: '1', unit: 'Nos', price: '' }

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function today(): string {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() - offset).toISOString().slice(0, 10)
}

/** Returns an error message, or null when the draft is a valid item. */
function validate(draft: ItemDraft): string | null {
  if (!draft.roomType.trim()) return 'Choose or type a room type.'
  if (!draft.name.trim()) return 'Enter the item name.'
  const quantity = Number(draft.quantity)
  if (!draft.quantity.trim() || !Number.isFinite(quantity) || quantity <= 0) return 'Quantity must be more than 0.'
  if (!draft.unit.trim()) return 'Choose or type a unit.'
  const price = Number(draft.price)
  if (!draft.price.trim() || !Number.isFinite(price) || price < 0) return 'Enter a unit price (0 or more).'
  return null
}

function toItem(draft: ItemDraft, id: string): EstimateItem {
  return {
    id,
    roomType: draft.roomType.trim(),
    name: draft.name.trim(),
    quantity: Number(draft.quantity),
    unit: draft.unit.trim(),
    price: Number(draft.price),
  }
}

function toDraft(item: EstimateItem): ItemDraft {
  return {
    roomType: item.roomType,
    name: item.name,
    quantity: String(item.quantity),
    unit: item.unit,
    price: String(item.price),
  }
}

export function EstimateBuilder() {
  const [estimate, setEstimate] = useState<Estimate>(EMPTY)
  const [loaded, setLoaded] = useState(false)
  const [draft, setDraft] = useState<ItemDraft>(BLANK_DRAFT)
  const [addError, setAddError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<ItemDraft>(BLANK_DRAFT)
  const [editError, setEditError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const itemNameRef = useRef<HTMLInputElement>(null)
  const roomListId = useId()
  const unitListId = useId()

  /**
   * Restore the draft from this browser. localStorage does not exist during
   * server rendering, so reading it in a lazy initialiser would make the
   * server and client renders disagree.
   */
  useEffect(() => {
    let restored: Estimate = { ...EMPTY, date: today() }
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<Estimate>
        restored = {
          clientName: parsed.clientName ?? '',
          date: parsed.date || today(),
          remarks: parsed.remarks ?? '',
          items: Array.isArray(parsed.items) ? parsed.items : [],
        }
      }
    } catch {
      // A corrupt draft is not worth failing over — start fresh.
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEstimate(restored)
    setLoaded(true)
  }, [])

  // Autosave every change, so a refresh or closed tab never loses work.
  useEffect(() => {
    if (!loaded) return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(estimate))
    } catch {
      // Private browsing can refuse writes; the builder still works.
    }
  }, [estimate, loaded])

  function flash(message: string) {
    setNotice(message)
    window.setTimeout(() => setNotice(null), 2400)
  }

  function patch(update: Partial<Estimate>) {
    setEstimate((current) => ({ ...current, ...update }))
  }

  function addItem(event: React.FormEvent) {
    event.preventDefault()
    const error = validate(draft)
    if (error) {
      setAddError(error)
      return
    }
    setEstimate((current) => ({ ...current, items: [...current.items, toItem(draft, newId())] }))
    setAddError(null)
    // Keep the room so several items for one room go in quickly.
    setDraft({ ...BLANK_DRAFT, roomType: draft.roomType })
    itemNameRef.current?.focus()
  }

  function startEdit(item: EstimateItem) {
    setEditingId(item.id)
    setEditDraft(toDraft(item))
    setEditError(null)
  }

  function saveEdit() {
    if (!editingId) return
    const error = validate(editDraft)
    if (error) {
      setEditError(error)
      return
    }
    const id = editingId
    setEstimate((current) => ({
      ...current,
      items: current.items.map((item) => (item.id === id ? toItem(editDraft, id) : item)),
    }))
    setEditingId(null)
    flash('Item updated.')
  }

  function cancelEdit() {
    setEditingId(null)
    setEditError(null)
  }

  function duplicate(item: EstimateItem) {
    setEstimate((current) => {
      const index = current.items.findIndex((i) => i.id === item.id)
      const copy = { ...item, id: newId() }
      const items = [...current.items]
      items.splice(index + 1, 0, copy)
      return { ...current, items }
    })
    flash('Item duplicated.')
  }

  function remove(item: EstimateItem) {
    if (!window.confirm(`Remove "${item.name}"?`)) return
    setEstimate((current) => ({ ...current, items: current.items.filter((i) => i.id !== item.id) }))
    if (editingId === item.id) setEditingId(null)
  }

  function move(item: EstimateItem, direction: -1 | 1) {
    setEstimate((current) => {
      const items = [...current.items]
      const index = items.findIndex((i) => i.id === item.id)
      // Move within the same room only, so the grouping stays intact.
      let target = index + direction
      while (target >= 0 && target < items.length && items[target]?.roomType !== item.roomType) {
        target += direction
      }
      if (target < 0 || target >= items.length) return current
      const [moved] = items.splice(index, 1)
      if (moved) items.splice(target, 0, moved)
      return { ...current, items }
    })
  }

  function startNew() {
    if (estimate.items.length && !window.confirm('Start a new estimate? The current one will be cleared.')) return
    setEstimate({ ...EMPTY, date: today() })
    setEditingId(null)
    setDraft(BLANK_DRAFT)
  }

  async function exportPdf() {
    if (!estimate.items.length) {
      flash('Add at least one item before downloading.')
      return
    }
    if (editingId) {
      flash('Save or cancel the item you are editing first.')
      return
    }
    setExporting(true)
    try {
      const { downloadEstimatePdf } = await import('@/lib/estimate/pdf')
      await downloadEstimatePdf(estimate)
    } catch {
      flash('Could not create the PDF. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  const groups = groupByRoom(estimate.items)
  const total = grandTotal(estimate.items)
  const draftTotal = Number(draft.quantity) * Number(draft.price)

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
      <datalist id={roomListId}>
        {ROOM_TYPES.map((room) => (
          <option key={room} value={room} />
        ))}
      </datalist>
      <datalist id={unitListId}>
        {UNITS.map((unit) => (
          <option key={unit} value={unit} />
        ))}
      </datalist>

      <div className="min-w-0 space-y-6">
        {/* ── Client ─────────────────────────────────────────── */}
        <section className="border border-line bg-surface p-5 sm:p-6">
          <p className="eyebrow">Client</p>
          <div className="mt-4 grid gap-5 sm:grid-cols-[1fr_12rem]">
            <Field label="Client / project name">
              {(field) => (
                <TextInput
                  {...field}
                  value={estimate.clientName}
                  onChange={(event) => patch({ clientName: event.target.value })}
                  placeholder="e.g. Sharma Residence"
                />
              )}
            </Field>
            <Field label="Date">
              {(field) => (
                <TextInput
                  {...field}
                  type="date"
                  value={estimate.date}
                  onChange={(event) => patch({ date: event.target.value })}
                />
              )}
            </Field>
          </div>
          <div className="mt-5">
            <Field label="Remarks" hint="Printed below the item table in the PDF.">
              {(field) => (
                <TextArea
                  {...field}
                  value={estimate.remarks}
                  onChange={(event) => patch({ remarks: event.target.value })}
                  placeholder="Any project notes to include"
                  className="min-h-24"
                />
              )}
            </Field>
          </div>
        </section>

        {/* ── Add item ───────────────────────────────────────── */}
        <section className="border border-line bg-surface p-5 sm:p-6">
          <p className="eyebrow">Add item</p>
          <form onSubmit={addItem} className="mt-4 space-y-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1.4fr]">
              <Field label="Room type" required>
                {(field) => (
                  <TextInput
                    {...field}
                    list={roomListId}
                    autoComplete="off"
                    value={draft.roomType}
                    onChange={(event) => setDraft({ ...draft, roomType: event.target.value })}
                    placeholder="Pick or type"
                  />
                )}
              </Field>
              <Field label="Item" required>
                {(field) => (
                  <TextInput
                    {...field}
                    ref={itemNameRef}
                    value={draft.name}
                    onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                    placeholder="e.g. Modular cabinet"
                  />
                )}
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-[1fr_1fr_1.3fr_auto] sm:items-end">
              <Field label="Quantity" required>
                {(field) => (
                  <TextInput
                    {...field}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="any"
                    value={draft.quantity}
                    onChange={(event) => setDraft({ ...draft, quantity: event.target.value })}
                  />
                )}
              </Field>
              <Field label="Unit" required>
                {(field) => (
                  <TextInput
                    {...field}
                    list={unitListId}
                    autoComplete="off"
                    value={draft.unit}
                    onChange={(event) => setDraft({ ...draft, unit: event.target.value })}
                  />
                )}
              </Field>
              <Field label="Unit price (₹)" required>
                {(field) => (
                  <TextInput
                    {...field}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={draft.price}
                    onChange={(event) => setDraft({ ...draft, price: event.target.value })}
                    placeholder="0.00"
                  />
                )}
              </Field>
              <Button type="submit" size="lg" className="col-span-2 h-12 sm:col-span-1">
                Add item
              </Button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              {addError ? (
                <p role="alert" className="text-danger">
                  {addError}
                </p>
              ) : (
                <span />
              )}
              {Number.isFinite(draftTotal) && draftTotal > 0 ? (
                <p className="text-ink-muted">
                  Line total <span className="font-medium text-ink tabular-nums">{formatInr(draftTotal)}</span>
                </p>
              ) : null}
            </div>
          </form>
        </section>

        {/* ── Items ──────────────────────────────────────────── */}
        <section className="border border-line bg-surface">
          <div className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-6">
            <p className="eyebrow">Items</p>
            <p className="text-sm text-ink-muted">
              {estimate.items.length} {estimate.items.length === 1 ? 'item' : 'items'}
            </p>
          </div>

          {groups.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <p className="font-display text-xl">No items yet</p>
              <p className="mt-2 text-sm text-ink-muted">
                Add the first item above. Items are grouped by room automatically.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-line">
              {groups.map((group) => (
                <div key={group.roomType}>
                  <div className="flex items-baseline justify-between bg-accent-soft/60 px-5 py-2.5 sm:px-6">
                    <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
                      {group.roomType}
                    </h3>
                    <span className="text-sm font-medium tabular-nums">{formatInr(group.subtotal)}</span>
                  </div>

                  <ul className="divide-y divide-line">
                    {group.items.map((item, index) =>
                      editingId === item.id ? (
                        <li key={item.id} className="bg-canvas px-5 py-5 sm:px-6">
                          <EditRow
                            draft={editDraft}
                            onChange={setEditDraft}
                            onSave={saveEdit}
                            onCancel={cancelEdit}
                            error={editError}
                            roomListId={roomListId}
                            unitListId={unitListId}
                          />
                        </li>
                      ) : (
                        <li
                          key={item.id}
                          className="group grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 px-5 py-3.5 transition-colors hover:bg-canvas sm:grid-cols-[1.6rem_1fr_auto_auto] sm:px-6"
                        >
                          <span className="hidden text-sm text-ink-muted tabular-nums sm:block">{index + 1}</span>
                          <div className="min-w-0">
                            <p className="font-medium break-words">{item.name}</p>
                            <p className="text-sm text-ink-muted tabular-nums">
                              {item.quantity} {item.unit} × {formatInr(item.price)}
                            </p>
                          </div>
                          <p className="text-right font-medium tabular-nums">{formatInr(lineTotal(item))}</p>
                          <div className="col-span-2 flex flex-wrap justify-end gap-1 sm:col-span-1">
                            <IconButton label={`Move ${item.name} up`} onClick={() => move(item, -1)} disabled={index === 0}>
                              ↑
                            </IconButton>
                            <IconButton
                              label={`Move ${item.name} down`}
                              onClick={() => move(item, 1)}
                              disabled={index === group.items.length - 1}
                            >
                              ↓
                            </IconButton>
                            <Button variant="ghost" size="sm" onClick={() => startEdit(item)}>
                              Edit
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => duplicate(item)}>
                              Duplicate
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => remove(item)}
                              className="text-danger hover:bg-danger-soft hover:text-danger"
                            >
                              Remove
                            </Button>
                          </div>
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ── Summary ──────────────────────────────────────────── */}
      <aside className="xl:sticky xl:top-8 xl:self-start">
        <div className="border border-line bg-ink p-6 text-ink-inverse">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-ink-inverse/60">Grand total</p>
          <p className="mt-2 font-display text-4xl tracking-tight tabular-nums">{formatInr(total)}</p>

          {groups.length > 0 ? (
            <ul className="mt-5 space-y-1.5 border-t border-ink-inverse/15 pt-4 text-sm">
              {groups.map((group) => (
                <li key={group.roomType} className="flex justify-between gap-3">
                  <span className="truncate text-ink-inverse/70">{group.roomType}</span>
                  <span className="tabular-nums">{formatInr(group.subtotal)}</span>
                </li>
              ))}
            </ul>
          ) : null}

          <Button
            variant="inverse"
            size="lg"
            className="mt-6 w-full"
            onClick={() => void exportPdf()}
            disabled={exporting}
          >
            {exporting ? 'Preparing PDF…' : 'Download PDF'}
          </Button>
          <button
            type="button"
            onClick={startNew}
            className="mt-3 w-full py-2 text-sm text-ink-inverse/70 transition-colors hover:text-ink-inverse"
          >
            Start a new estimate
          </button>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-ink-muted">
          Saved automatically in this browser. The PDF includes payment terms, specifications,
          exclusions and terms &amp; conditions.
        </p>
      </aside>

      {notice ? (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-[2px] bg-ink px-4 py-2.5 text-sm text-ink-inverse shadow-lg"
        >
          {notice}
        </div>
      ) : null}
    </div>
  )
}

function EditRow({
  draft,
  onChange,
  onSave,
  onCancel,
  error,
  roomListId,
  unitListId,
}: {
  draft: ItemDraft
  onChange: (draft: ItemDraft) => void
  onSave: () => void
  onCancel: () => void
  error: string | null
  roomListId: string
  unitListId: string
}) {
  const total = Number(draft.quantity) * Number(draft.price)

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault()
      onSave()
    } else if (event.key === 'Escape') {
      onCancel()
    }
  }

  return (
    <div onKeyDown={onKeyDown} className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Editing item</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Room type">
          {(field) => (
            <TextInput
              {...field}
              list={roomListId}
              autoComplete="off"
              value={draft.roomType}
              onChange={(event) => onChange({ ...draft, roomType: event.target.value })}
            />
          )}
        </Field>
        <Field label="Item">
          {(field) => (
            <TextInput
              {...field}
              autoFocus
              value={draft.name}
              onChange={(event) => onChange({ ...draft, name: event.target.value })}
            />
          )}
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Field label="Quantity">
          {(field) => (
            <TextInput
              {...field}
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={draft.quantity}
              onChange={(event) => onChange({ ...draft, quantity: event.target.value })}
            />
          )}
        </Field>
        <Field label="Unit">
          {(field) => (
            <TextInput
              {...field}
              list={unitListId}
              autoComplete="off"
              value={draft.unit}
              onChange={(event) => onChange({ ...draft, unit: event.target.value })}
            />
          )}
        </Field>
        <Field label="Unit price (₹)">
          {(field) => (
            <TextInput
              {...field}
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={draft.price}
              onChange={(event) => onChange({ ...draft, price: event.target.value })}
            />
          )}
        </Field>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className={cn('text-sm', error ? 'text-danger' : 'text-ink-muted')} role={error ? 'alert' : undefined}>
          {error ?? (Number.isFinite(total) ? `Line total ${formatInr(total)}` : '')}
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="sm" onClick={onSave}>
            Save changes
          </Button>
        </div>
      </div>
    </div>
  )
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex size-9 items-center justify-center rounded-[2px] text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink disabled:opacity-30"
    >
      {children}
    </button>
  )
}
