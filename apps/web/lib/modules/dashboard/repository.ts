import { prisma, LeadStatus, type Prisma } from '@crm/database'

/**
 * Dashboard aggregates.
 *
 * Every query is a COUNT or GROUP BY against an indexed column — no rows are
 * pulled into the application to be counted there. The whole dashboard is
 * one `$transaction` round trip.
 */

export type DashboardCounts = {
  totalLeads: number
  newLeads: number
  hotLeads: number
  followUpsToday: number
  overdueFollowUps: number
  siteVisits: number
  wonProjects: number
}

export type Breakdown = { key: string; count: number }

export type DashboardData = DashboardCounts & {
  bySource: Breakdown[]
  byCity: Breakdown[]
  byPropertyType: Breakdown[]
  byBudget: Breakdown[]
  recentLeads: Awaited<ReturnType<typeof recentLeadsQuery>>
}

function recentLeadsQuery(scope: Prisma.LeadWhereInput) {
  return prisma.lead.findMany({
    where: { AND: [{ deletedAt: null }, scope] },
    orderBy: { createdAt: 'desc' },
    take: 8,
    select: {
      id: true,
      leadNumber: true,
      status: true,
      temperature: true,
      score: true,
      createdAt: true,
      customer: { select: { fullName: true, city: true } },
      assignedTo: { select: { name: true } },
    },
  })
}

export async function loadDashboard(
  scope: Prisma.LeadWhereInput,
  followUpScope: Prisma.FollowUpWhereInput,
): Promise<DashboardData> {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfTomorrow = new Date(startOfToday.getTime() + 86_400_000)

  const base: Prisma.LeadWhereInput = { AND: [{ deletedAt: null }, scope] }

  const [
    totalLeads,
    newLeads,
    hotLeads,
    siteVisits,
    wonProjects,
    followUpsToday,
    overdueFollowUps,
    bySource,
    byCity,
    byPropertyType,
    byBudget,
    recentLeads,
  ] = await prisma.$transaction([
    prisma.lead.count({ where: base }),
    prisma.lead.count({ where: { AND: [base, { status: LeadStatus.NEW }] } }),
    prisma.lead.count({ where: { AND: [base, { temperature: 'HOT' }] } }),
    prisma.lead.count({ where: { AND: [base, { status: LeadStatus.SITE_VISIT }] } }),
    prisma.lead.count({ where: { AND: [base, { status: LeadStatus.WON }] } }),

    prisma.followUp.count({
      where: {
        AND: [
          followUpScope,
          { status: 'PENDING', scheduledAt: { gte: startOfToday, lt: startOfTomorrow } },
        ],
      },
    }),
    prisma.followUp.count({
      where: { AND: [followUpScope, { status: 'PENDING', scheduledAt: { lt: startOfToday } }] },
    }),

    prisma.lead.groupBy({ by: ['source'], where: base, _count: { _all: true }, orderBy: { _count: { source: 'desc' } } }),
    prisma.customer.groupBy({
      by: ['city'],
      where: { deletedAt: null, leads: { some: base } },
      _count: { _all: true },
      orderBy: { _count: { city: 'desc' } },
      take: 8,
    }),
    prisma.leadRequirement.groupBy({
      by: ['propertyType'],
      where: { lead: base },
      _count: { _all: true },
      orderBy: { _count: { propertyType: 'desc' } },
    }),
    prisma.leadRequirement.groupBy({
      by: ['budgetKey'],
      where: { lead: base },
      _count: { _all: true },
      orderBy: { _count: { budgetKey: 'desc' } },
    }),

    recentLeadsQuery(scope),
  ])

  const toBreakdown = <T extends Record<string, unknown>>(
    rows: T[],
    field: keyof T,
  ): Breakdown[] =>
    rows
      .map((row) => ({
        key: String(row[field] ?? 'Unknown'),
        count: Number((row as { _count?: { _all?: number } })._count?._all ?? 0),
      }))
      .filter((row) => row.count > 0)
      .sort((a, b) => b.count - a.count)

  return {
    totalLeads,
    newLeads,
    hotLeads,
    siteVisits,
    wonProjects,
    followUpsToday,
    overdueFollowUps,
    bySource: toBreakdown(bySource, 'source'),
    byCity: toBreakdown(byCity, 'city'),
    byPropertyType: toBreakdown(byPropertyType, 'propertyType'),
    byBudget: toBreakdown(byBudget, 'budgetKey'),
    recentLeads,
  }
}
