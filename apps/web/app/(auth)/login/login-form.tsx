'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Field, TextInput } from '@/components/ui/field'
import { loginAction, type FormResult } from './actions'

function SubmitButton() {
  // useFormStatus must be called from a child of the <form>, not the
  // component that renders it.
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? 'Signing in…' : 'Sign in'}
    </Button>
  )
}

export function LoginForm({
  nextPath,
  initialError,
}: {
  nextPath: string
  initialError?: string | undefined
}) {
  const [state, formAction] = useActionState<FormResult, FormData>(loginAction, {
    ok: false,
    ...(initialError ? { error: initialError } : {}),
  })

  return (
    <form action={formAction} className="mt-8 space-y-5">
      <input type="hidden" name="next" value={nextPath} />

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

      <Field label="Password" required>
        {(field) => (
          <TextInput
            {...field}
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        )}
      </Field>

      {state.error ? (
        <div
          role="alert"
          className="border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger"
        >
          {state.error}
        </div>
      ) : null}

      <SubmitButton />
    </form>
  )
}
