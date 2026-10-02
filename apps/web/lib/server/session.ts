import { redirect } from 'next/navigation'
import {
  can,
  followUpVisibility,
  leadVisibility,
  type Permission,
  type Role,
} from '@crm/config'
import { auth } from '@/auth'
import { ForbiddenError, UnauthenticatedError } from './errors'

/**
 * Session access and authorization — layer two.
 *
 * Every Server Action and every CRM page starts here. `proxy.ts` only
 * checked that a cookie existed; this verifies the signed token.
 */

export type SessionUser = {
  id: string
  name: string
  email: string
  role: Role
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth()
  if (!session?.user?.id) return null

  return {
    id: session.user.id,
    name: session.user.name ?? '',
    email: session.user.email ?? '',
    role: session.user.role as Role,
  }
}

/** For pages: redirects to the login form. */
export async function requireUser(nextPath?: string): Promise<SessionUser> {
  const user = await getSessionUser()
  if (!user) {
    redirect(nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : '/login')
  }
  return user
}

/** For Server Actions and route handlers: throws rather than redirects. */
export async function requireUserOrThrow(): Promise<SessionUser> {
  const user = await getSessionUser()
  if (!user) throw new UnauthenticatedError()
  return user
}

export async function requirePermission(permission: Permission): Promise<SessionUser> {
  const user = await requireUserOrThrow()
  if (!can(user.role, permission)) {
    throw new ForbiddenError('You do not have permission to do that.')
  }
  return user
}

/** Page equivalent of requirePermission — renders the 403 page instead. */
export async function requirePermissionForPage(
  permission: Permission,
  path: string,
): Promise<SessionUser> {
  const user = await requireUser(path)
  if (!can(user.role, permission)) redirect('/dashboard?denied=1')
  return user
}

export function leadScopeFor(user: SessionUser): 'all' | 'assigned' {
  return leadVisibility(user.role)
}

export function followUpScopeFor(user: SessionUser): 'all' | 'own' {
  return followUpVisibility(user.role)
}
