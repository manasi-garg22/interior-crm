'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Field, TextInput } from '@/components/ui/field'
import { resetPasswordAction, type FormResult } from '../login/actions'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? 'Saving…' : 'Set new password'}
    </Button>
  )
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction] = useActionState<FormResult, FormData>(resetPasswordAction, {
    ok: false,
  })

  if (state.ok) {
    return (
      <div className="mt-8 space-y-5">
        <div className="border border-line bg-surface px-5 py-4 text-sm">
          Your password has been changed and all other sessions were signed out.
        </div>
        <Link
          href="/login"
          className="inline-flex h-11 w-full items-center justify-center rounded-[2px] bg-ink px-5 text-sm font-medium text-ink-inverse hover:bg-ink-soft"
        >
          Sign in
        </Link>
      </div>
    )
  }

  return (
    <form action={formAction} className="mt-8 space-y-5">
      <input type="hidden" name="token" value={token} />

      <Field label="New password" required>
        {(field) => (
          <TextInput
            {...field}
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={12}
            required
          />
        )}
      </Field>

      <Field label="Confirm new password" required>
        {(field) => (
          <TextInput
            {...field}
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            minLength={12}
            required
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
