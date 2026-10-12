import { prisma, LeadStatus, type Prisma } from '@crm/database'
import { startOfBusinessDay, startOfNextBusinessDay } from '@/lib/time'

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
  /** Sum of locked deal values on WON leads, in INR. */
  wonValueTotal: number
  /** Same, for leads won since the 1st of this month (IST). */
  wonValueThisMonth: number
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
  // IST day boundaries; the server's own clock is UTC.
  const startOfToday = startOfBusinessDay(now)
  const startOfTomorrow = startOfNextBusinessDay(now)

  const base: Prisma.LeadWhereInput = { AND: [{ deletedAt: null }, scope] }

  // 1st of the current month at IST midnight (IST is a fixed +05:30).
  const IST_OFFSET_MS = 330 * 60_000
  const istNow = new Date(now.getTime() + IST_OFFSET_MS)
  const startOfMonth = new Date(
    Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), 1) - IST_OFFSET_MS,
  )

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
    wonValueAll,
    wonValueMonth,
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

    prisma.lead.groupBy({
      by: ['source'],
      where: base,
      _count: { _all: true },
      orderBy: { _count: { source: 'desc' } },
    }),
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

    prisma.lead.aggregate({
      where: { AND: [base, { status: LeadStatus.WON }] },
      _sum: { wonValue: true },
    }),
    prisma.lead.aggregate({
      where: { AND: [base, { status: LeadStatus.WON, wonAt: { gte: startOfMonth } }] },
      _sum: { wonValue: true },
    }),
  ])

  const toBreakdown = <T extends Record<string, unknown>>(rows: T[], field: keyof T): Breakdown[] =>
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
    wonValueTotal: Number(wonValueAll._sum.wonValue ?? 0),
    wonValueThisMonth: Number(wonValueMonth._sum.wonValue ?? 0),
    followUpsToday,
    overdueFollowUps,
    bySource: toBreakdown(bySource, 'source'),
    byCity: toBreakdown(byCity, 'city'),
    byPropertyType: toBreakdown(byPropertyType, 'propertyType'),
    byBudget: toBreakdown(byBudget, 'budgetKey'),
    recentLeads,
  }
}
