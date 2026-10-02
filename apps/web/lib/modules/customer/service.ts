import { NotFoundError } from '@/lib/server/errors'
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

export async function listCustomers(query: string | undefined, user: SessionUser) {
  return repository.listCustomerSummaries({
    query,
    ownedByUserId: leadScopeFor(user) === 'assigned' ? user.id : undefined,
  })
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
