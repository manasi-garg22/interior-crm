import type { Metadata } from 'next'
import Link from 'next/link'
import { LoginForm } from './login-form'

export const metadata: Metadata = {
  title: 'Sign in',
  robots: { index: false, follow: false },
}

export default async function LoginPage(props: {
  searchParams: Promise<{ next?: string; error?: string }>
}) {
  const { next, error } = await props.searchParams

  return (
    <div>
      <h1 className="font-display text-title tracking-tight">Sign in</h1>
      <p className="mt-2 text-ink-muted">Access the lead management console.</p>

      <LoginForm
        nextPath={sanitizeNext(next)}
        initialError={error ? 'Invalid email or password.' : undefined}
      />

      <p className="mt-8 text-sm text-ink-muted">
        <Link href="/forgot-password" className="underline underline-offset-4 hover:text-ink">
          Forgot your password?
        </Link>
      </p>
    </div>
  )
}

/**
 * Only same-site relative paths are honoured. Without this an attacker could
 * send ?next=https://evil.example and turn the login form into an open
 * redirect that looks like it came from us.
 */
function sanitizeNext(value: string | undefined): string {
  if (!value) return '/dashboard'
  if (!value.startsWith('/') || value.startsWith('//')) return '/dashboard'
  return value
}
