import type { Metadata } from 'next'
import Link from 'next/link'
import { ForgotPasswordForm } from './forgot-password-form'

export const metadata: Metadata = {
  title: 'Forgot password',
  robots: { index: false, follow: false },
}

export default function ForgotPasswordPage() {
  return (
    <div>
      <h1 className="font-display text-title tracking-tight">Reset your password</h1>
      <p className="mt-2 text-ink-muted">
        Enter your email and we&rsquo;ll send you a link to choose a new one.
      </p>

      <ForgotPasswordForm />

      <p className="mt-8 text-sm text-ink-muted">
        <Link href="/login" className="underline underline-offset-4 hover:text-ink">
          Back to sign in
        </Link>
      </p>
    </div>
  )
}
