import { describe, expect, it } from 'vitest'
import {
  ROLES,
  can,
  canGrantRole,
  followUpVisibility,
  leadVisibility,
  ROLE_PERMISSIONS,
  type Role,
} from '@crm/config'

describe('role permissions', () => {
  it('gives SUPER_ADMIN everything', () => {
    expect(can('SUPER_ADMIN', 'settings:manage')).toBe(true)
    expect(can('SUPER_ADMIN', 'lead:delete')).toBe(true)
    expect(can('SUPER_ADMIN', 'audit:read')).toBe(true)
  })

  it('limits a sales executive to their own leads', () => {
    expect(can('SALES_EXECUTIVE', 'lead:read:assigned')).toBe(true)
    expect(can('SALES_EXECUTIVE', 'lead:read:all')).toBe(false)
    expect(leadVisibility('SALES_EXECUTIVE')).toBe('assigned')
    expect(followUpVisibility('SALES_EXECUTIVE')).toBe('own')
  })

  it('lets a sales manager see the whole pipeline and assign work', () => {
    expect(leadVisibility('SALES_MANAGER')).toBe('all')
    expect(can('SALES_MANAGER', 'lead:assign')).toBe(true)
  })

  it('keeps user administration away from the sales roles', () => {
    expect(can('SALES_MANAGER', 'user:manage')).toBe(false)
    expect(can('SALES_EXECUTIVE', 'user:manage')).toBe(false)
    expect(can('ADMIN', 'user:manage')).toBe(true)
  })

  it('makes VIEWER genuinely read-only', () => {
    const writePermissions = ROLE_PERMISSIONS.VIEWER.filter((permission) =>
      /:(create|update|delete|assign|upload|manage)$/.test(permission),
    )
    expect(writePermissions).toEqual([])
  })

  it('never lets a designer reassign or delete leads', () => {
    expect(can('DESIGNER', 'lead:assign')).toBe(false)
    expect(can('DESIGNER', 'lead:delete')).toBe(false)
  })
})

describe('privilege escalation guard', () => {
  it('stops an admin from creating a super admin', () => {
    expect(canGrantRole('ADMIN', 'SUPER_ADMIN')).toBe(false)
    expect(canGrantRole('ADMIN', 'SALES_MANAGER')).toBe(true)
  })

  it('stops an admin from granting their own rank', () => {
    expect(canGrantRole('ADMIN', 'ADMIN')).toBe(false)
  })

  it('stops roles without user:manage from granting anything', () => {
    for (const role of ['SALES_MANAGER', 'SALES_EXECUTIVE', 'DESIGNER', 'VIEWER'] as Role[]) {
      expect(canGrantRole(role, 'VIEWER')).toBe(false)
    }
  })

  it('lets a super admin grant any role', () => {
    for (const role of ROLES) {
      expect(canGrantRole('SUPER_ADMIN', role)).toBe(true)
    }
  })
})
