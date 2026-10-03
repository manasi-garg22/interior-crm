import { prisma, LeadStatus, Role, type Prisma, type Lead, type ActivityType } from '@crm/database'
import { OPEN_LEAD_STATUSES, type AssignmentCandidate } from './assignment'

/**
 * Lead data access. The only place in the lead module that talks to Prisma.
 */

export function runInTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(fn, {
    // Neon serverless can have cold-start latency; give the transaction
    // enough headroom to complete even on first wake.
    timeout: 30_000,
    maxWait: 10_000,
  })
}

export { nextLeadNumber } from '@crm/database/reference-numbers'

export type InsertLeadInput = {
  leadNumber: string
  customerId: string
  source: Lead['source']
  campaignId: string | null
  assignedToId: string | null
  score: number
  temperature: Lead['temperature']
  scoreBreakdown: unknown
  isRepeatEnquiry: boolean
  attribution: {
    utmSource?: string
    utmMedium?: string
    utmCampaign?: string
    utmContent?: string
    utmTerm?: string
    referrerUrl?: string
    landingPath?: string
  }
  ipHash: string | null
  userAgent: string | null
}

export async function insertLead(
  tx: Prisma.TransactionClient,
  input: InsertLeadInput,
): Promise<Lead> {
  return tx.lead.create({
    data: {
      leadNumber: input.leadNumber,
      customerId: input.customerId,
      source: input.source,
      campaignId: input.campaignId,
      assignedToId: input.assignedToId,
      assignedAt: input.assignedToId ? new Date() : null,
      score: input.score,
      temperature: input.temperature,
      scoreBreakdown: input.scoreBreakdown as Prisma.InputJsonValue,
      isRepeatEnquiry: input.isRepeatEnquiry,
      utmSource: input.attribution.utmSource ?? null,
      utmMedium: input.attribution.utmMedium ?? null,
      utmCampaign: input.attribution.utmCampaign ?? null,
      utmContent: input.attribution.utmContent ?? null,
      utmTerm: input.attribution.utmTerm ?? null,
      referrerUrl: input.attribution.referrerUrl ?? null,
      landingPath: input.attribution.landingPath ?? null,
      ipHash: input.ipHash,
      userAgent: input.userAgent,
    },
  })
}

export async function insertRequirement(
  tx: Prisma.TransactionClient,
  data: Prisma.LeadRequirementUncheckedCreateInput,
): Promise<void> {
  await tx.leadRequirement.create({ data })
}

export async function insertActivity(
  tx: Prisma.TransactionClient,
  input: {
    leadId: string
    userId: string | null
    type: ActivityType
    title: string
    description?: string | null
    metadata?: Prisma.InputJsonValue
  },
): Promise<void> {
  await tx.leadActivity.create({
    data: {
      leadId: input.leadId,
      userId: input.userId,
      type: input.type,
      title: input.title,
      description: input.description ?? null,
      ...(input.metadata === undefined ? {} : { metadata: input.metadata }),
    },
  })
}

/**
 * Everyone eligible to receive a lead, with the open-pipeline count the
 * selection algorithm ranks on.
 */
export async function loadAssignmentCandidates(
  tx: Prisma.TransactionClient,
): Promise<AssignmentCandidate[]> {
  const users = await tx.user.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      role: { in: [Role.SALES_EXECUTIVE, Role.SALES_MANAGER] },
    },
    select: {
      id: true,
      assignedLeads: {
        where: { status: { in: [...OPEN_LEAD_STATUSES] }, deletedAt: null },
        select: { assignedAt: true },
      },
    },
  })

  return users.map((user) => {
    const timestamps = user.assignedLeads
      .map((lead) => lead.assignedAt?.getTime() ?? 0)
      .filter((time) => time > 0)

    return {
      id: user.id,
      openLeadCount: user.assignedLeads.length,
      lastAssignedAt: timestamps.length > 0 ? new Date(Math.max(...timestamps)) : null,
    }
  })
}

export async function findCampaignByCode(
  tx: Prisma.TransactionClient,
  code: string,
): Promise<{ id: string } | null> {
  return tx.campaign.findFirst({
    where: { code, isActive: true },
    select: { id: true },
  })
}

// ── Read side ───────────────────────────────────────────────

/**
 * Row-level scope. A SALES_EXECUTIVE only ever sees leads assigned to them,
 * and this is where that is enforced — not in the UI, where hiding a button
 * would be cosmetic.
 */
export function scopeFilter(
  visibility: 'all' | 'assigned',
  userId: string,
): Prisma.LeadWhereInput {
  return visibility === 'all' ? {} : { assignedToId: userId }
}

export const LEAD_LIST_INCLUDE = {
  customer: { select: { id: true, fullName: true, phone: true, city: true } },
  assignedTo: { select: { id: true, name: true } },
  requirement: {
    select: { propertyType: true, budgetKey: true, budgetMin: true, budgetMax: true, city: true },
  },
} satisfies Prisma.LeadInclude

export async function findLeadById(id: string, scope: Prisma.LeadWhereInput) {
  return prisma.lead.findFirst({
    where: { AND: [{ id, deletedAt: null }, scope] },
    include: {
      customer: true,
      assignedTo: { select: { id: true, name: true, email: true } },
      campaign: { select: { id: true, name: true, code: true } },
      requirement: true,
      activities: {
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true } } },
      },
      followUps: {
        orderBy: { scheduledAt: 'asc' },
        include: { assignedTo: { select: { id: true, name: true } } },
      },
      communications: { orderBy: { occurredAt: 'desc' }, take: 50 },
      documents: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' } },
      project: true,
    },
  })
}

export async function countLeads(where: Prisma.LeadWhereInput): Promise<number> {
  return prisma.lead.count({ where })
}

export async function listLeads(
  where: Prisma.LeadWhereInput,
  orderBy: Prisma.LeadOrderByWithRelationInput,
  skip: number,
  take: number,
) {
  return prisma.lead.findMany({ where, orderBy, skip, take, include: LEAD_LIST_INCLUDE })
}

export async function updateLeadStatus(
  tx: Prisma.TransactionClient,
  leadId: string,
  status: LeadStatus,
  extra: Prisma.LeadUpdateInput = {},
): Promise<Lead> {
  return tx.lead.update({
    where: { id: leadId },
    data: {
      status,
      statusChangedAt: new Date(),
      ...timestampFor(status),
      ...extra,
    },
  })
}

/** Keeps the funnel timestamps in step with the status without the caller remembering. */
function timestampFor(status: LeadStatus): Prisma.LeadUpdateInput {
  switch (status) {
    case LeadStatus.CONTACTED:
      return { firstContactedAt: new Date() }
    case LeadStatus.QUALIFIED:
      return { qualifiedAt: new Date() }
    case LeadStatus.WON:
      return { wonAt: new Date() }
    case LeadStatus.LOST:
      return { lostAt: new Date() }
    default:
      return {}
  }
}

export async function assignLead(
  tx: Prisma.TransactionClient,
  leadId: string,
  assignedToId: string | null,
): Promise<Lead> {
  return tx.lead.update({
    where: { id: leadId },
    data: { assignedToId, assignedAt: assignedToId ? new Date() : null },
  })
}

export async function refreshNextFollowUp(
  tx: Prisma.TransactionClient,
  leadId: string,
): Promise<void> {
  const next = await tx.followUp.findFirst({
    where: { leadId, status: 'PENDING' },
    orderBy: { scheduledAt: 'asc' },
    select: { scheduledAt: true },
  })

  // Denormalized onto Lead so the list view can sort and filter on it
  // without a correlated subquery for every row.
  await tx.lead.update({
    where: { id: leadId },
    data: { nextFollowUpAt: next?.scheduledAt ?? null },
  })
}
