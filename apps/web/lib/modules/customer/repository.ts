import { prisma, type Prisma, type Customer } from '@crm/database'

/**
 * Customer data access.
 *
 * `findForDeduplication` is the important one: it decides whether an incoming
 * enquiry belongs to somebody already in the CRM.
 */

export async function findForDeduplication(
  tx: Prisma.TransactionClient,
  phoneE164: string,
  email: string | undefined,
): Promise<Customer | null> {
  // Phone first — it is the unique key and the field customers get right.
  const byPhone = await tx.customer.findUnique({ where: { phone: phoneE164 } })
  if (byPhone) return byPhone

  // Email is a weaker signal (shared family addresses, typos) but still
  // better than minting a duplicate person.
  if (email) {
    const byEmail = await tx.customer.findUnique({ where: { email } })
    if (byEmail) return byEmail
  }

  return null
}

export type CustomerUpsertInput = {
  fullName: string
  phoneE164: string
  phoneRaw: string
  whatsappNumber: string | undefined
  email: string | undefined
  city: string | undefined
  state: string | undefined
  preferredContact: 'PHONE' | 'WHATSAPP' | 'EMAIL'
  source: Customer['firstSource']
}

export async function createCustomer(
  tx: Prisma.TransactionClient,
  input: CustomerUpsertInput,
): Promise<Customer> {
  return tx.customer.create({
    data: {
      fullName: input.fullName,
      phone: input.phoneE164,
      phoneRaw: input.phoneRaw,
      whatsappNumber: input.whatsappNumber ?? null,
      email: input.email ?? null,
      city: input.city ?? null,
      state: input.state ?? null,
      preferredContact: input.preferredContact,
      firstSource: input.source,
    },
  })
}

/**
 * Fills in details the customer supplied this time but that we did not have
 * before. Deliberately never overwrites an existing non-empty value: a repeat
 * enquiry with a shortened name must not clobber the record a salesperson has
 * already corrected.
 */
export async function enrichCustomer(
  tx: Prisma.TransactionClient,
  existing: Customer,
  input: CustomerUpsertInput,
): Promise<Customer> {
  const patch: Prisma.CustomerUpdateInput = {}

  if (!existing.email && input.email) patch.email = input.email
  if (!existing.whatsappNumber && input.whatsappNumber) patch.whatsappNumber = input.whatsappNumber
  if (!existing.city && input.city) patch.city = input.city
  if (!existing.state && input.state) patch.state = input.state

  if (Object.keys(patch).length === 0) return existing

  return tx.customer.update({ where: { id: existing.id }, data: patch })
}

export async function findCustomerById(id: string) {
  return prisma.customer.findFirst({
    where: { id, deletedAt: null },
    include: {
      leads: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        include: { requirement: true, assignedTo: { select: { id: true, name: true } } },
      },
      projects: { orderBy: { createdAt: 'desc' } },
      documents: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' } },
      communications: { orderBy: { occurredAt: 'desc' }, take: 50 },
    },
  })
}

export async function listCustomerSummaries(options: {
  query: string | undefined
  /** When set, only customers with at least one lead owned by this user. */
  ownedByUserId: string | undefined
  take?: number
}) {
  const { query, ownedByUserId, take = 100 } = options

  return prisma.customer.findMany({
    where: {
      deletedAt: null,
      ...(ownedByUserId
        ? { leads: { some: { assignedToId: ownedByUserId, deletedAt: null } } }
        : {}),
      ...(query
        ? {
            OR: [
              { fullName: { contains: query, mode: 'insensitive' } },
              { phone: { contains: query } },
              { email: { contains: query, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
    take,
    select: {
      id: true,
      fullName: true,
      phone: true,
      email: true,
      city: true,
      createdAt: true,
      _count: { select: { leads: true, projects: true } },
    },
  })
}

/** Used to decide whether a scoped user may open a customer at all. */
export async function ownsAnyLeadFor(
  customerId: string,
  userId: string,
): Promise<boolean> {
  const lead = await prisma.lead.findFirst({
    where: { customerId, assignedToId: userId, deletedAt: null },
    select: { id: true },
  })
  return lead !== null
}

export async function searchCustomers(query: string, take = 20) {
  return prisma.customer.findMany({
    where: {
      deletedAt: null,
      OR: [
        { fullName: { contains: query, mode: 'insensitive' } },
        { phone: { contains: query } },
        { email: { contains: query, mode: 'insensitive' } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take,
  })
}
