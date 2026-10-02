import type { Permission } from '@crm/config'

/**
 * Navigation is permission-driven: a role that cannot read campaigns never
 * sees the link. This is presentation only — the pages themselves re-check,
 * because hiding a link is not access control.
 */
export type NavItem = {
  href: string
  label: string
  permission: Permission
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', permission: 'customer:read' },
  { href: '/leads', label: 'Leads', permission: 'lead:read:assigned' },
  { href: '/pipeline', label: 'Pipeline', permission: 'lead:read:assigned' },
  { href: '/customers', label: 'Customers', permission: 'customer:read' },
  { href: '/follow-ups', label: 'Follow-ups', permission: 'followup:read:own' },
  { href: '/projects', label: 'Projects', permission: 'project:read' },
  { href: '/analytics', label: 'Analytics', permission: 'analytics:read' },
  { href: '/campaigns', label: 'Campaigns', permission: 'campaign:read' },
  { href: '/users', label: 'Users & Roles', permission: 'user:read' },
  { href: '/settings', label: 'Settings', permission: 'settings:manage' },
]
