'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/ui/button'
import type { NavItem } from './nav-items'

type Props = {
  items: NavItem[]
  companyName: string
  user: { name: string; email: string; role: string }
  signOutAction: () => Promise<void>
}

export function CrmShell({ items, companyName, user, signOutAction, children }: Props & {
  children: React.ReactNode
}) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  return (
    <div className="flex min-h-dvh bg-canvas">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-surface lg:flex">
        <SidebarContent
          items={items}
          pathname={pathname}
          companyName={companyName}
          user={user}
          signOutAction={signOutAction}
        />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-ink/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-line bg-surface">
            <SidebarContent
              items={items}
              pathname={pathname}
              companyName={companyName}
              user={user}
              signOutAction={signOutAction}
              onNavigate={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="flex h-14 items-center gap-3 border-b border-line bg-surface px-4 lg:hidden">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          >
            <span aria-hidden className="text-lg leading-none">
              ☰
            </span>
          </Button>
          <span className="font-display text-base tracking-tight">{companyName}</span>
        </header>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  )
}

function SidebarContent({
  items,
  pathname,
  companyName,
  user,
  signOutAction,
  onNavigate,
}: {
  items: NavItem[]
  pathname: string
  companyName: string
  user: { name: string; email: string; role: string }
  signOutAction: () => Promise<void>
  onNavigate?: () => void
}) {
  return (
    <>
      <div className="flex h-16 items-center border-b border-line px-5">
        <Link href="/dashboard" className="font-display text-lg tracking-tight" onClick={onNavigate}>
          {companyName}
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-0.5">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex min-h-11 items-center rounded-[2px] px-3 text-sm transition-colors',
                    active
                      ? 'bg-ink font-medium text-ink-inverse'
                      : 'text-ink-soft hover:bg-surface-sunken hover:text-ink',
                  )}
                >
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="border-t border-line p-3">
        <div className="px-3 py-2">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="truncate text-xs text-ink-muted">{formatRole(user.role)}</p>
        </div>
        <form action={signOutAction}>
          <button
            type="submit"
            className="flex min-h-11 w-full items-center rounded-[2px] px-3 text-sm text-ink-soft transition-colors hover:bg-surface-sunken hover:text-ink"
          >
            Sign out
          </button>
        </form>
      </div>
    </>
  )
}

function formatRole(role: string): string {
  return role
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
