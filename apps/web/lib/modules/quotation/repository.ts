import { prisma, type Prisma } from '@crm/database'

/** Quotation register data access. */

export const QUOTATION_LIST_SELECT = {
  id: true,
  kind: true,
  clientName: true,
  documentDate: true,
  total: true,
  itemCount: true,
  createdAt: true,
  customer: { select: { id: true, fullName: true, phone: true, city: true } },
  createdBy: { select: { name: true } },
} satisfies Prisma.QuotationSelect

export function findCustomerOptions(where: Prisma.CustomerWhereInput) {
  return prisma.customer.findMany({
    where,
    orderBy: { fullName: 'asc' },
    take: 5000,
    select: { id: true, fullName: true, phone: true, city: true },
  })
}

export function findActiveCustomer(id: string) {
  return prisma.customer.findFirst({ where: { id, deletedAt: null }, select: { id: true } })
}

export function createQuotation(data: Prisma.QuotationUncheckedCreateInput) {
  return prisma.quotation.create({ data, select: { id: true } })
}

export function countQuotations(where: Prisma.QuotationWhereInput) {
  return prisma.quotation.count({ where })
}

export function findQuotations(
  where: Prisma.QuotationWhereInput,
  options: { skip?: number; take: number; orderBy: Prisma.QuotationOrderByWithRelationInput },
) {
  return prisma.quotation.findMany({ where, ...options, select: QUOTATION_LIST_SELECT })
}

export async function sumQuotationTotals(where: Prisma.QuotationWhereInput): Promise<number> {
  const result = await prisma.quotation.aggregate({ where, _sum: { total: true } })
  return Number(result._sum.total ?? 0)
}
