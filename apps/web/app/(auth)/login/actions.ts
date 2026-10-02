'use server'

import { AuthError } from 'next-auth'
import { getEnv } from '@crm/config'
import { forgotPasswordSchema, loginSchema, resetPasswordSchema } from '@crm/validation'
import { signIn } from '@/auth'
import { completePasswordReset, requestPasswordReset } from '@/lib/modules/user/service'

export type FormResult = { ok: boolean; error?: string }

/**
 * Sign-in.
 *
 * Always reports the same message regardless of whether the email exists,
 * the password was wrong, or the account is disabled — anything more
 * specific turns this form into an account-enumeration oracle.
 */
export async function loginAction(_previous: FormResult, formData: FormData): Promise<FormResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return { ok: false, error: 'Enter your email address and password.' }
  }

  const rawNext = String(formData.get('next') ?? '/dashboard')
  const redirectTo = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/dashboard'

  try {
    await signIn('credentials', {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo,
    })
    return { ok: true }
  } catch (error) {
    // A successful signIn throws a redirect, which Next must be allowed to
    // propagate — only genuine auth failures are converted to a message.
    if (error instanceof AuthError) {
      return { ok: false, error: 'Invalid email or password.' }
    }
    throw error
  }
}

export async function forgotPasswordAction(
  _previous: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get('email') })

  // The same response either way — this must not reveal who has an account.
  if (parsed.success) {
    await requestPasswordReset(parsed.data.email, getEnv().NEXT_PUBLIC_APP_URL)
  }

  return { ok: true }
}

export async function resetPasswordAction(
  _previous: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get('token'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  })

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check the form and try again.' }
  }

  const outcome = await completePasswordReset(parsed.data.token, parsed.data.password)
  return outcome.ok ? { ok: true } : { ok: false, error: outcome.reason }
}
