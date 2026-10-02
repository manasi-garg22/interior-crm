'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Field, TextInput } from '@/components/ui/field'
import { forgotPasswordAction, type FormResult } from '../login/actions'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? 'Sending…' : 'Send reset link'}
    </Button>
  )
}

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState<FormResult, FormData>(forgotPasswordAction, {
    ok: false,
  })

  // Deliberately confirms nothing about whether the address is registered.
  if (state.ok) {
    return (
      <div className="mt-8 border border-line bg-surface px-5 py-4">
        <p className="text-sm">
          If that email address has an account, a reset link is on its way. It expires in 30
          minutes.
        </p>
      </div>
    )
  }

  return (
    <form action={formAction} className="mt-8 space-y-5">
      <Field label="Email" required>
        {(field) => (
          <TextInput
            {...field}
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@company.com"
          />
        )}
      </Field>

      {state.error ? (
        <div role="alert" className="border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
          {state.error}
        </div>
      ) : null}

      <SubmitButton />
    </form>
  )
}
