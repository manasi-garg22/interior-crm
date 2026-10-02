import { can, getPublicEnv, type Role } from '@crm/config'
import { requireUser } from '@/lib/server/session'
import { signOut } from '@/auth'
import { CrmShell } from '@/components/crm/sidebar'
import { NAV_ITEMS } from '@/components/crm/nav-items'

/**
 * Layer two of the three-layer guard.
 *
 * `proxy.ts` only saw that a cookie existed. This verifies the signed token
 * on every CRM request and redirects if it is missing, expired or revoked.
 */
export default async function CrmLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser()
  const env = getPublicEnv()

  const visibleItems = NAV_ITEMS.filter((item) => can(user.role as Role, item.permission))

  async function signOutAction(): Promise<void> {
    'use server'
    await signOut({ redirectTo: '/login' })
  }

  return (
    <CrmShell
      items={visibleItems}
      companyName={env.companyName}
      user={{ name: user.name, email: user.email, role: user.role }}
      signOutAction={signOutAction}
    >
      {children}
    </CrmShell>
  )
}
