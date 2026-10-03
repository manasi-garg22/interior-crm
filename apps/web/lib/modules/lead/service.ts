import { scoreLead, type ScoringResult } from '@crm/config'
import { isCommercialPropertyType, type LeadSubmission } from '@crm/validation'
import { ActivityType, OptionSetKey } from '@crm/database'
import { ValidationError } from '@/lib/server/errors'
import { logger } from '@/lib/server/logger'
import { enqueueEvent } from '@/lib/events/outbox'
import * as customerRepo from '@/lib/modules/customer/repository'
import * as optionRepo from '@/lib/modules/options/repository'
import * as leadRepo from './repository'
import { pickAssignee } from './assignment'

const log = logger.child('lead.service')

export type CreateLeadContext = {
  ipHash: string | null
  userAgent: string | null
}

export type CreateLeadResult = {
  leadId: string
  leadNumber: string
  customerName: string
  isExistingCustomer: boolean
}

/**
 * Turns a public form submission into a customer, a lead, a requirement, a
 * score, an assignment, an activity record and a queued notification — all
 * inside one transaction.
 *
 * The ordering matters. The customer lookup and the counter increment both
 * happen inside the transaction so two simultaneous submissions from the same
 * phone number cannot create two customers or collide on a lead number.
 */
export async function createLeadFromSubmission(
  input: LeadSubmission,
  context: CreateLeadContext,
): Promise<CreateLeadResult> {
  // Option keys are validated before opening the transaction: they are
  // config reads, and there is no point holding a transaction open for them.
  const [budget, timeline] = await Promise.all([
    optionRepo.findOption(OptionSetKey.BUDGET_RANGE, input.budgetKey),
    optionRepo.findOption(OptionSetKey.TIMELINE, input.timelineKey),
  ])

  if (!budget) {
    throw new ValidationError('That budget range is no longer available', {
      budgetKey: ['Choose a budget range'],
    })
  }
  if (!timeline) {
    throw new ValidationError('That timeline is no longer available', {
      timelineKey: ['Choose a timeline'],
    })
  }

  // A stale browser tab could hold options an admin has since removed.
  const [unknownSpaces, unknownStyles] = await Promise.all([
    optionRepo.findUnknownKeys(OptionSetKey.SPACE_REQUIREMENT, input.spaceRequirements),
    optionRepo.findUnknownKeys(OptionSetKey.DESIGN_STYLE, input.designStyles),
  ])

  if (unknownSpaces.length > 0) {
    throw new ValidationError('Some selected areas are no longer available', {
      spaceRequirements: ['Please review your selection'],
    })
  }
  // Design style is decorative metadata, not a decision input — silently drop
  // stale values rather than blocking a customer from submitting.
  const designStyles = input.designStyles.filter((style) => !unknownStyles.includes(style))

  const scoring: ScoringResult = scoreLead({
    budgetWeight: budget.scoreWeight,
    timelineWeight: timeline.scoreWeight,
    areaSqft: input.areaSqft ?? null,
    hasWhatsApp: Boolean(input.whatsappNumber),
    // Phone passed libphonenumber validation during parsing. It is not an
    // OTP check; the scoring rule means "we have a usable number".
    phoneVerified: true,
    isCommercial: isCommercialPropertyType(input.propertyType),
  })

  // Pull read-only lookups outside the transaction — they have no race risk
  // and keeping them inside would hold the transaction open during Neon's
  // cold-start latency, causing it to expire before the first write lands.
  const [campaign, candidates] = await Promise.all([
    input.utmCampaign ? leadRepo.findCampaignByCodeDirect(input.utmCampaign) : Promise.resolve(null),
    leadRepo.loadAssignmentCandidatesDirect(),
  ])
  const assignedToId = pickAssignee(candidates)

  return leadRepo.runInTransaction(async (tx) => {
    const existing = await customerRepo.findForDeduplication(tx, input.phone, input.email)

    const customerInput = {
      fullName: input.fullName,
      phoneE164: input.phone,
      phoneRaw: input.phone,
      whatsappNumber: input.whatsappNumber,
      email: input.email,
      city: input.city,
      state: input.state,
      preferredContact: input.preferredContact,
      source: input.source,
    }

    const customer = existing
      ? await customerRepo.enrichCustomer(tx, existing, customerInput)
      : await customerRepo.createCustomer(tx, customerInput)

    const isExistingCustomer = existing !== null

    const leadNumber = await leadRepo.nextLeadNumber(tx)

    const lead = await leadRepo.insertLead(tx, {
      leadNumber,
      customerId: customer.id,
      source: input.source,
      campaignId: campaign?.id ?? null,
      assignedToId,
      score: scoring.score,
      temperature: scoring.temperature,
      scoreBreakdown: scoring.breakdown,
      isRepeatEnquiry: isExistingCustomer,
      attribution: {
        utmSource: input.utmSource,
        utmMedium: input.utmMedium,
        utmCampaign: input.utmCampaign,
        utmContent: input.utmContent,
        utmTerm: input.utmTerm,
        referrerUrl: input.referrerUrl,
        landingPath: input.landingPath,
      },
      ipHash: context.ipHash,
      userAgent: context.userAgent,
    })

    await leadRepo.insertRequirement(tx, {
      leadId: lead.id,
      propertyType: input.propertyType,
      propertyTypeOther: input.propertyTypeOther ?? null,
      propertyStatus: input.propertyStatus,
      locationLine: input.locationLine ?? null,
      city: input.city,
      state: input.state ?? null,
      pincode: input.pincode ?? null,
      areaSqft: input.areaSqft ?? null,
      floors: input.floors ?? null,
      possessionDate: input.possessionDate ?? null,
      spaceRequirements: input.spaceRequirements,
      spaceOther: input.spaceOther ?? null,
      designStyles,
      budgetKey: budget.key,
      budgetMin: budget.numericMin,
      budgetMax: budget.numericMax,
      timelineKey: timeline.key,
      notes: input.notes ?? null,
    })

    await leadRepo.insertActivity(tx, {
      leadId: lead.id,
      userId: null,
      type: ActivityType.LEAD_CREATED,
      title: isExistingCustomer
        ? 'Existing customer — new enquiry'
        : 'Lead created from website form',
      description: `Scored ${scoring.score} (${scoring.temperature})`,
      metadata: { source: input.source, breakdown: scoring.breakdown },
    })

    if (assignedToId) {
      await leadRepo.insertActivity(tx, {
        leadId: lead.id,
        userId: null,
        type: ActivityType.ASSIGNED,
        title: 'Automatically assigned',
      })
    }

    // Inside the transaction on purpose: the notification cannot be lost, and
    // a failing integration cannot roll back the customer's enquiry.
    await enqueueEvent(tx, 'LEAD_CREATED', {
      leadId: lead.id,
      leadNumber,
      customerId: customer.id,
      customerName: customer.fullName,
      assignedToId,
      temperature: scoring.temperature,
      score: scoring.score,
      isRepeatEnquiry: isExistingCustomer,
      details: {
        phone: input.phone,
        whatsappNumber: input.whatsappNumber ?? null,
        email: input.email ?? null,
        preferredContact: input.preferredContact,
        city: input.city ?? null,
        state: input.state ?? null,
        locality: input.locationLine ?? null,
        pincode: input.pincode ?? null,
        propertyType: input.propertyType,
        propertyTypeOther: input.propertyTypeOther ?? null,
        propertyStatus: input.propertyStatus,
        areaSqft: input.areaSqft ?? null,
        floors: input.floors ?? null,
        possessionDate: input.possessionDate ? input.possessionDate.toISOString().slice(0, 10) : null,
        spaces: input.spaceRequirements,
        spaceOther: input.spaceOther ?? null,
        designStyles,
        budget: budget.label,
        timeline: timeline.label,
        notes: input.notes ?? null,
        source: input.source,
        utmCampaign: input.utmCampaign ?? null,
      },
    })

    log.info('lead created', {
      leadNumber,
      temperature: scoring.temperature,
      isExistingCustomer,
      assigned: Boolean(assignedToId),
    })

    return {
      leadId: lead.id,
      leadNumber,
      customerName: customer.fullName,
      isExistingCustomer,
    }
  })
}
