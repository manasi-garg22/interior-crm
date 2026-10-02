/**
 * Role-based access control.
 *
 * This matrix is layer two of three. Layer one is the route guard in
 * proxy.ts (coarse: is there a session at all). Layer three is row scoping
 * inside the repositories — a SALES_EXECUTIVE's lead query gets
 * `assignedToId = me` injected there, not in the UI.
 *
 * Hiding a button is cosmetics. Layers two and three are the actual control,
 * and both are required.
 */

export const ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'SALES_MANAGER',
  'SALES_EXECUTIVE',
  'DESIGNER',
  'VIEWER',
] as const

export type Role = (typeof ROLES)[number]

export const PERMISSIONS = [
  // Leads. The :all / :assigned split is what row scoping keys off.
  'lead:read:all',
  'lead:read:assigned',
  'lead:create',
  'lead:update',
  'lead:assign',
  'lead:delete',

  'customer:read',
  'customer:update',

  'followup:read:all',
  'followup:read:own',
  'followup:create',
  'followup:update',

  'document:read',
  'document:upload',
  'document:delete',

  'project:read',
  'project:create',
  'project:update',

  'campaign:read',
  'campaign:manage',

  'analytics:read',

  'user:read',
  'user:manage',

  'settings:manage',
  'audit:read',
] as const

export type Permission = (typeof PERMISSIONS)[number]

const SALES_EXECUTIVE_PERMISSIONS: Permission[] = [
  'lead:read:assigned',
  'lead:create',
  'lead:update',
  'customer:read',
  'customer:update',
  'followup:read:own',
  'followup:create',
  'followup:update',
  'document:read',
  'document:upload',
  'project:read',
]

const SALES_MANAGER_PERMISSIONS: Permission[] = [
  'lead:read:all',
  'lead:create',
  'lead:update',
  'lead:assign',
  'customer:read',
  'customer:update',
  'followup:read:all',
  'followup:create',
  'followup:update',
  'document:read',
  'document:upload',
  'document:delete',
  'project:read',
  'project:create',
  'project:update',
  'campaign:read',
  'analytics:read',
  'user:read',
]

const DESIGNER_PERMISSIONS: Permission[] = [
  'lead:read:assigned',
  'customer:read',
  'document:read',
  'document:upload',
  'project:read',
  'project:update',
]

const VIEWER_PERMISSIONS: Permission[] = [
  'lead:read:all',
  'customer:read',
  'followup:read:all',
  'document:read',
  'project:read',
  'campaign:read',
  'analytics:read',
]

const ADMIN_PERMISSIONS: Permission[] = [
  ...SALES_MANAGER_PERMISSIONS,
  'lead:delete',
  'campaign:manage',
  'user:manage',
  'settings:manage',
  'audit:read',
]

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  SUPER_ADMIN: PERMISSIONS,
  ADMIN: ADMIN_PERMISSIONS,
  SALES_MANAGER: SALES_MANAGER_PERMISSIONS,
  SALES_EXECUTIVE: SALES_EXECUTIVE_PERMISSIONS,
  DESIGNER: DESIGNER_PERMISSIONS,
  VIEWER: VIEWER_PERMISSIONS,
}

export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission)
}

export function canAny(role: Role, permissions: Permission[]): boolean {
  return permissions.some((permission) => can(role, permission))
}

/**
 * Whether this role sees every lead or only the ones assigned to them.
 * Repositories call this to decide whether to inject the ownership filter.
 */
export function leadVisibility(role: Role): 'all' | 'assigned' {
  return can(role, 'lead:read:all') ? 'all' : 'assigned'
}

export function followUpVisibility(role: Role): 'all' | 'own' {
  return can(role, 'followup:read:all') ? 'all' : 'own'
}

/** Only these roles can be picked as the owner of a lead. */
export const ASSIGNABLE_ROLES: readonly Role[] = ['SALES_MANAGER', 'SALES_EXECUTIVE']

/**
 * Privilege-escalation guard: nobody may grant a role at or above their own,
 * and only a SUPER_ADMIN may mint another SUPER_ADMIN.
 */
const ROLE_RANK: Record<Role, number> = {
  SUPER_ADMIN: 100,
  ADMIN: 80,
  SALES_MANAGER: 60,
  SALES_EXECUTIVE: 40,
  DESIGNER: 30,
  VIEWER: 10,
}

export function canGrantRole(actorRole: Role, targetRole: Role): boolean {
  if (actorRole === 'SUPER_ADMIN') return true
  if (!can(actorRole, 'user:manage')) return false
  return ROLE_RANK[targetRole] < ROLE_RANK[actorRole]
}

export function roleRank(role: Role): number {
  return ROLE_RANK[role]
}
