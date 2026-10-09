'use client'

import { useId } from 'react'
import { cn } from '@/lib/utils/cn'

/**
 * Form primitives.
 *
 * Every control is wired to its label and, when invalid, to its error message
 * via aria-describedby and aria-invalid — so a screen reader announces the
 * problem rather than the field simply turning red.
 */

const CONTROL =
  'w-full rounded-[2px] border bg-surface px-3.5 text-ink placeholder:text-ink-muted transition-colors focus:border-accent focus:outline-none disabled:opacity-50'

export function Field({
  label,
  error,
  hint,
  required,
  children,
}: {
  label: string
  error?: string | undefined
  hint?: string | undefined
  required?: boolean
  children: (props: {
    id: string
    'aria-invalid': boolean
    'aria-describedby': string | undefined
  }) => React.ReactNode
}) {
  const id = useId()
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const describedBy = error ? errorId : hint ? hintId : undefined

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
        {required ? <span className="ml-1 text-accent">*</span> : null}
      </label>

      {children({ id, 'aria-invalid': Boolean(error), 'aria-describedby': describedBy })}

      {error ? (
        <p id={errorId} role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-sm text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export function TextInput({
  invalid,
  className,
  ...props
}: React.ComponentProps<'input'> & { invalid?: boolean }) {
  // ComponentProps includes `ref`, which React 19 passes through as a prop.
  return (
    <input
      className={cn(CONTROL, 'h-12', invalid ? 'border-danger' : 'border-line-strong', className)}
      {...props}
    />
  )
}

export function TextArea({
  invalid,
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      className={cn(
        CONTROL,
        'min-h-28 py-3',
        invalid ? 'border-danger' : 'border-line-strong',
        className,
      )}
      {...props}
    />
  )
}

export function SelectInput({
  invalid,
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <select
      className={cn(CONTROL, 'h-12', invalid ? 'border-danger' : 'border-line-strong', className)}
      {...props}
    >
      {children}
    </select>
  )
}
