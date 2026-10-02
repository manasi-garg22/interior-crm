import type { Metadata } from 'next'
import Link from 'next/link'
import { ResetPasswordForm } from './reset-password-form'

export const metadata: Metadata = {
  title: 'Choose a new password',
  robots: { index: false, follow: false },
}

export default async function ResetPasswordPage(props: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await props.searchParams

  if (!token) {
    return (
      <div>
        <h1 className="font-display text-title tracking-tight">Link not valid</h1>
        <p className="mt-2 text-ink-muted">
          This reset link is missing its token. Request a new one.
        </p>
        <p className="mt-8 text-sm">
          <Link href="/forgot-password" className="underline underline-offset-4">
            Request a new link
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="font-display text-title tracking-tight">Choose a new password</h1>
      <p className="mt-2 text-ink-muted">At least 12 characters. Longer is better than complex.</p>
      <ResetPasswordForm token={token} />
    </div>
  )
}
