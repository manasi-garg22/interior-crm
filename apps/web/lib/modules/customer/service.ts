import type { Prisma } from '@crm/database'
import { NotFoundError } from '@/lib/server/errors'
import { businessDayEndFromCalendarDate, businessDayStartFromCalendarDate } from '@/lib/time'
import { leadScopeFor, type SessionUser } from '@/lib/server/session'
import * as repository from './repository'

/**
 * Customer profiles.
 *
 * The scoping rule here is subtle and worth stating. A sales executive can
 * open a customer they own a lead for, but must not thereby see that
 * customer's other leads belonging to colleagues. So access is decided on
 * "do you own at least one of their leads", while the leads listed on the
 * profile are filtered separately.
 */

export const CUSTOMER_PAGE_SIZE = 25

const SOURCES = [
  'INSTAGRAM',
  'FACEBOOK',
  'GOOGLE',
  'WEBSITE',
  'WHATSAPP',
  'REFERRAL',
  'DIRECT',
  'OTHER',
] as const
const LEAD_STATUSES = [
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'CONSULTATION',
  'SITE_VISIT',
  'QUOTATION',
  'DESIGN',
  'NEGOTIATION',
  'WON',
  'LOST',
  'ON_HOLD',
] as const

const SORTS: Record<string, Prisma.CustomerOrderByWithRelationInput> = {
  newest: { createdAt: 'desc' },
  oldest: { createdAt: 'asc' },
  name: { fullName: 'asc' },
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

/**
 * Customer list with filters from the URL. Every value is untrusted: an
 * unknown source, status or malformed date is simply ignored.
 */
export async function listCustomers(
  params: Record<string, string | string[] | undefined>,
  user: SessionUser,
  page: number,
) {
  const get = (key: string): string | undefined => {
    const value = params[key]
    const first = Array.isArray(value) ? value[0] : value
    return first?.trim() ? first.trim().slice(0, 120) : undefined
  }
  const oneOf = <T extends string>(
    value: string | undefined,
    allowed: readonly T[],
  ): T | undefined => (allowed.includes(value as T) ? (value as T) : undefined)
  const date = (key: string, edge: 'start' | 'end'): Date | undefined => {
    const value = get(key)
    if (!value || !DATE_ONLY.test(value)) return undefined
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return undefined
    // The dates are IST calendar days.
    return edge === 'start'
      ? businessDayStartFromCalendarDate(parsed)
      : businessDayEndFromCalendarDate(parsed)
  }

  const { total, rows } = await repository.listCustomerSummaries({
    query: get('q'),
    city: get('city'),
    source: oneOf(get('source'), SOURCES),
    leadStatus: oneOf(get('status'), LEAD_STATUSES),
    createdFrom: date('createdFrom', 'start'),
    createdTo: date('createdTo', 'end'),
    orderBy: SORTS[get('sort') ?? 'newest'] ?? SORTS.newest,
    ownedByUserId: leadScopeFor(user) === 'assigned' ? user.id : undefined,
    skip: (page - 1) * CUSTOMER_PAGE_SIZE,
    take: CUSTOMER_PAGE_SIZE,
  })

  return {
    rows,
    total,
    page,
    pageSize: CUSTOMER_PAGE_SIZE,
    pageCount: Math.max(1, Math.ceil(total / CUSTOMER_PAGE_SIZE)),
  }
}

export async function getCustomerProfile(customerId: string, user: SessionUser) {
  const scoped = leadScopeFor(user) === 'assigned'

  if (scoped && !(await repository.ownsAnyLeadFor(customerId, user.id))) {
    // Same error as a genuinely missing customer — distinguishing the two
    // would confirm that a customer with this id exists.
    throw new NotFoundError('Customer')
  }

  const customer = await repository.findCustomerById(customerId)
  if (!customer) throw new NotFoundError('Customer')

  const visibleLeads = scoped
    ? customer.leads.filter((lead) => lead.assignedToId === user.id)
    : customer.leads

  return { ...customer, leads: visibleLeads }
}
