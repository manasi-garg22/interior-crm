import type { Prisma } from '@crm/database'
import type { LeadFilters } from '@crm/validation'
import type { SessionUser } from '@/lib/server/session'
import { leadScopeFor } from '@/lib/server/session'
import * as repository from './repository'

/**
 * The leads list.
 *
 * Filtering, sorting and pagination all happen in Postgres against indexed
 * columns. Everything is driven from URL query parameters, so a filtered
 * view is shareable and bookmarkable — which is why the whole filter set is
 * parsed from the query string rather than held in client state.
 */

type RawLeadRow = Awaited<ReturnType<typeof repository.listLeads>>[number]

/**
 * `followUpOverdue` is derived here rather than in the table component:
 * reading the clock during render is impure, and it would make the row
 * markup non-deterministic between the server render and hydration.
 */
export type LeadListRow = RawLeadRow & { followUpOverdue: boolean }

export type LeadListResult = {
  rows: LeadListRow[]
  total: number
  page: number
  pageSize: number
  pageCount: number
}

export async function listLeadsForUser(
  filters: LeadFilters,
  user: SessionUser,
): Promise<LeadListResult> {
  const where = buildWhere(filters, user)
  const orderBy = buildOrderBy(filters)

  const skip = (filters.page - 1) * filters.pageSize

  const [total, rows] = await Promise.all([
    repository.countLeads(where),
    repository.listLeads(where, orderBy, skip, filters.pageSize),
  ])

  const now = Date.now()

  return {
    rows: rows.map((row) => ({
      ...row,
      followUpOverdue: row.nextFollowUpAt != null && row.nextFollowUpAt.getTime() < now,
    })),
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    pageCount: Math.max(1, Math.ceil(total / filters.pageSize)),
  }
}

function buildWhere(filters: LeadFilters, user: SessionUser): Prisma.LeadWhereInput {
  const conditions: Prisma.LeadWhereInput[] = [{ deletedAt: null }]

  // Row-level scope. A sales executive only ever sees their own leads, and
  // this cannot be overridden by any query parameter.
  if (leadScopeFor(user) === 'assigned') {
    conditions.push({ assignedToId: user.id })
  }

  if (filters.q) {
    const term = filters.q.trim()
    conditions.push({
      OR: [
        { leadNumber: { contains: term, mode: 'insensitive' } },
        { customer: { fullName: { contains: term, mode: 'insensitive' } } },
        { customer: { phone: { contains: term } } },
        { customer: { email: { contains: term, mode: 'insensitive' } } },
      ],
    })
  }

  if (filters.status?.length) conditions.push({ status: { in: filters.status } })
  if (filters.temperature?.length) conditions.push({ temperature: { in: filters.temperature } })
  if (filters.source?.length) conditions.push({ source: { in: filters.source } })
  if (filters.campaignId) conditions.push({ campaignId: filters.campaignId })

  if (filters.assignedToId) {
    conditions.push(
      filters.assignedToId === 'unassigned'
        ? { assignedToId: null }
        : { assignedToId: filters.assignedToId },
    )
  }

  if (filters.city) conditions.push({ customer: { city: { equals: filters.city, mode: 'insensitive' } } })
  if (filters.budgetKey) conditions.push({ requirement: { budgetKey: filters.budgetKey } })

  if (filters.createdFrom || filters.createdTo) {
    conditions.push({
      createdAt: {
        ...(filters.createdFrom ? { gte: filters.createdFrom } : {}),
        ...(filters.createdTo ? { lte: endOfDay(filters.createdTo) } : {}),
      },
    })
  }

  if (filters.overdueFollowUp) {
    conditions.push({ nextFollowUpAt: { lt: new Date() } })
  }

  return { AND: conditions }
}

function buildOrderBy(filters: LeadFilters): Prisma.LeadOrderByWithRelationInput {
  // Only the whitelisted sort fields from the schema reach this point, so
  // the column name can never be attacker-controlled.
  return { [filters.sortBy]: filters.sortDir }
}

function endOfDay(date: Date): Date {
  const copy = new Date(date)
  copy.setHours(23, 59, 59, 999)
  return copy
}
