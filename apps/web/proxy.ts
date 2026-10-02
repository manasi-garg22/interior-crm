import { NextResponse, type NextRequest } from 'next/server'

/**
 * Coarse route gate.
 *
 * In Next.js 16 this file replaces `middleware.ts`, and the exported
 * function is named `proxy`.
 *
 * This is layer one of three, and deliberately the weakest: it only checks
 * whether a session cookie is *present*, so an unauthenticated visitor gets
 * a redirect instead of a flash of the CRM shell. It does NOT verify the
 * token — a forged cookie sails straight through here.
 *
 * Real enforcement happens in the CRM layout (which calls `auth()` and
 * verifies the signature) and in the repositories (which scope rows to the
 * signed-in user). Treating this file as a security boundary would be a
 * mistake.
 */

const SESSION_COOKIES = ['authjs.session-token', '__Secure-authjs.session-token']

const CRM_PREFIXES = [
  '/dashboard',
  '/leads',
  '/pipeline',
  '/customers',
  '/follow-ups',
  '/projects',
  '/analytics',
  '/campaigns',
  '/settings',
  '/users',
]

export function proxy(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl

  const hasSession = SESSION_COOKIES.some((name) => request.cookies.has(name))
  const isCrmRoute = CRM_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )

  if (isCrmRoute && !hasSession) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    // Bring them back where they were headed once they sign in.
    url.search = `?next=${encodeURIComponent(pathname + search)}`
    return NextResponse.redirect(url)
  }

  // Already signed in and staring at the login form — send them onward.
  if (hasSession && (pathname === '/login' || pathname === '/forgot-password')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Everything except static assets, image optimisation, the favicon and
     * the auth endpoints themselves.
     */
    '/((?!_next/static|_next/image|favicon.ico|api/auth|.*\\.(?:svg|png|jpg|jpeg|webp|gif|ico)$).*)',
  ],
}
