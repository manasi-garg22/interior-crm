import type { SessionUser } from '@/lib/server/session'
import { followUpScopeFor, leadScopeFor } from '@/lib/server/session'
import * as repository from './repository'

export type DashboardView = repository.DashboardData & {
  conversionRate: number
}

/**
 * Dashboard figures, scoped to what this user is allowed to see. A sales
 * executive's "total leads" is their own pipeline, not the company's.
 */
export async function getDashboard(user: SessionUser): Promise<DashboardView> {
  const leadScope = leadScopeFor(user) === 'all' ? {} : { assignedToId: user.id }
  const followUpScope = followUpScopeFor(user) === 'all' ? {} : { assignedToId: user.id }

  const data = await repository.loadDashboard(leadScope, followUpScope)

  return {
    ...data,
    conversionRate:
      data.totalLeads === 0 ? 0 : Math.round((data.wonProjects / data.totalLeads) * 1000) / 10,
  }
}
