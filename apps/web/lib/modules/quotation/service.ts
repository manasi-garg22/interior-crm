import type { Prisma } from '@crm/database'
import type { RecordQuotationInput } from '@crm/validation'
import { NotFoundError } from '@/lib/server/errors'
import { leadScopeFor, type SessionUser } from '@/lib/server/session'
import { istMonthRange } from '@/lib/time'
import { ownsAnyLeadFor } from '@/lib/modules/customer/repository'
import * as repository from './repository'

/**
 * The quotation register: every estimate / bill PDF downloaded from the
 * CRM's cost-estimate tool, with the customer it was for and its total.
 *
 * A sales executive only sees and records quotations for customers they
 * own a lead for — the same rule as the customer list.
 */

export const QUOTATION_PAGE_SIZE = 25

export type CustomerOption = { id: string; name: string; phone: string; city: string | null }

/** Customers the user may pick in the estimate tool, alphabetically. */
export async function listCustomerOptions(user: SessionUser): Promise<CustomerOption[]> {
  const rows = await repository.findCustomerOptions({
    deletedAt: null,
    ...(leadScopeFor(user) === 'assigned'
      ? { leads: { some: { assignedToId: user.id, deletedAt: null } } }
      : {}),
  })
  return rows.map((row) => ({ id: row.id, name: row.fullName, phone: row.phone, city: row.city }))
}

export async function recordQuotation(input: RecordQuotationInput, user: SessionUser) {
  const customer = await repository.findActiveCustomer(input.customerId)
  if (!customer) throw new NotFoundError('Customer')
  if (leadScopeFor(user) === 'assigned' && !(await ownsAnyLeadFor(customer.id, user.id))) {
    // Same error as a missing customer, so ids cannot be probed.
    throw new NotFoundError('Customer')
  }

  // The total is recomputed here; the browser's figure is not trusted.
  const total = input.items.reduce((sum, item) => sum + item.quantity * item.price, 0)

  return repository.createQuotation({
    kind: input.kind === 'bill' ? 'BILL' : 'ESTIMATE',
    customerId: customer.id,
    clientName: input.clientName?.trim() || null,
    documentDate: input.date ? new Date(`${input.date}T00:00:00.000Z`) : null,
    total: Math.round(total * 100) / 100,
    itemCount: input.items.length,
    items: { items: input.items, remarks: input.remarks ?? '' },
    createdById: user.id,
  })
}

export type QuotationFilters = {
  month?: string | undefined
  kind?: 'ESTIMATE' | 'BILL' | undefined
  q?: string | undefined
}

function whereFor(filters: QuotationFilters, user: SessionUser): Prisma.QuotationWhereInput {
  const conditions: Prisma.QuotationWhereInput[] = []

  if (leadScopeFor(user) === 'assigned') conditions.push({ createdById: user.id })

  const range = filters.month ? istMonthRange(filters.month) : null
  if (range) conditions.push({ createdAt: { gte: range.from, lt: range.to } })
  if (filters.kind) conditions.push({ kind: filters.kind })
  if (filters.q) {
    conditions.push({
      OR: [
        { clientName: { contains: filters.q, mode: 'insensitive' } },
        { customer: { fullName: { contains: filters.q, mode: 'insensitive' } } },
        { customer: { phone: { contains: filters.q } } },
      ],
    })
  }

  return { AND: conditions }
}

export async function listQuotations(filters: QuotationFilters, user: SessionUser, page: number) {
  const where = whereFor(filters, user)
  const [total, rows, sumTotal] = await Promise.all([
    repository.countQuotations(where),
    repository.findQuotations(where, {
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * QUOTATION_PAGE_SIZE,
      take: QUOTATION_PAGE_SIZE,
    }),
    repository.sumQuotationTotals(where),
  ])

  return {
    rows: rows.map((row) => ({ ...row, total: Number(row.total) })),
    total,
    sumTotal,
    page,
    pageSize: QUOTATION_PAGE_SIZE,
    pageCount: Math.max(1, Math.ceil(total / QUOTATION_PAGE_SIZE)),
  }
}

/** Every quotation in the filter, for CSV export (capped well above a month's volume). */
export async function quotationsForExport(filters: QuotationFilters, user: SessionUser) {
  const rows = await repository.findQuotations(whereFor(filters, user), {
    orderBy: { createdAt: 'asc' },
    take: 20_000,
  })
  return rows.map((row) => ({ ...row, total: Number(row.total) }))
}
