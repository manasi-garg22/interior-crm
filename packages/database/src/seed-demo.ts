import {
  ActivityType,
  LeadSource,
  LeadStatus,
  LeadTemperature,
  PropertyStatus,
  PropertyType,
  Role,
  type PrismaClient,
} from '@prisma/client'
import { nextLeadNumber } from './reference-numbers'
import { BUDGET_RANGES, TIMELINES } from './seed-data'

/**
 * Demo leads, behind `npm run db:seed -- --demo`.
 *
 * Exists so the dashboard, filters and breakdown charts have something to
 * show on day one. Deterministic rather than random: the same command twice
 * produces the same spread, which makes screenshots and manual testing
 * reproducible.
 */

const FIRST_NAMES = ['Priya', 'Rahul', 'Ananya', 'Vikram', 'Meera', 'Arjun', 'Kavya', 'Rohan']
const LAST_NAMES = ['Sharma', 'Iyer', 'Nair', 'Reddy', 'Gupta', 'Desai', 'Menon', 'Kulkarni']
const CITIES = ['Bengaluru', 'Pune', 'Hyderabad', 'Chennai', 'Mumbai']

const STATUS_SPREAD: LeadStatus[] = [
  LeadStatus.NEW,
  LeadStatus.NEW,
  LeadStatus.NEW,
  LeadStatus.CONTACTED,
  LeadStatus.CONTACTED,
  LeadStatus.QUALIFIED,
  LeadStatus.CONSULTATION,
  LeadStatus.SITE_VISIT,
  LeadStatus.DESIGN,
  LeadStatus.QUOTATION,
  LeadStatus.NEGOTIATION,
  LeadStatus.WON,
  LeadStatus.LOST,
  LeadStatus.ON_HOLD,
]

const SOURCE_SPREAD: LeadSource[] = [
  LeadSource.INSTAGRAM,
  LeadSource.INSTAGRAM,
  LeadSource.INSTAGRAM,
  LeadSource.WEBSITE,
  LeadSource.WEBSITE,
  LeadSource.GOOGLE,
  LeadSource.REFERRAL,
  LeadSource.FACEBOOK,
  LeadSource.WHATSAPP,
  LeadSource.DIRECT,
]

const PROPERTY_SPREAD: PropertyType[] = [
  PropertyType.RESIDENTIAL,
  PropertyType.RESIDENTIAL,
  PropertyType.RESIDENTIAL,
  PropertyType.OFFICE,
  PropertyType.CAFE,
  PropertyType.RETAIL,
  PropertyType.RESTAURANT,
  PropertyType.COMMERCIAL,
]

const RESIDENTIAL_SPACES = ['living_room', 'kitchen', 'bedroom', 'wardrobe', 'complete_home']
const COMMERCIAL_SPACES = ['reception', 'office', 'cabin', 'meeting_room', 'retail']

/** Deterministic pseudo-random so repeated runs match. */
function pick<T>(list: readonly T[], seed: number): T {
  const value = list[seed % list.length]
  if (value === undefined) throw new Error('pick() called with an empty list')
  return value
}

const DEMO_LEAD_COUNT = 60

export async function seedDemoLeads(prisma: PrismaClient): Promise<void> {
  const existing = await prisma.lead.count()
  if (existing > 0) {
    console.log('  • demo leads skipped (leads already exist)')
    return
  }

  const salesUsers = await prisma.user.findMany({
    where: { role: { in: [Role.SALES_EXECUTIVE, Role.SALES_MANAGER] } },
    select: { id: true },
  })
  const campaigns = await prisma.campaign.findMany({ select: { id: true, code: true } })

  const now = Date.now()

  for (let index = 0; index < DEMO_LEAD_COUNT; index += 1) {
    const firstName = pick(FIRST_NAMES, index)
    const lastName = pick(LAST_NAMES, index * 3 + 1)
    const city = pick(CITIES, index * 7)
    const propertyType = pick(PROPERTY_SPREAD, index)
    const status = pick(STATUS_SPREAD, index)
    const source = pick(SOURCE_SPREAD, index * 5)
    const budget = pick(BUDGET_RANGES, index * 2)
    const timeline = pick(TIMELINES, index * 3)

    const isCommercial = propertyType !== PropertyType.RESIDENTIAL
    const areaSqft = 600 + ((index * 137) % 3400)

    // Mirrors the real scoring rules so the demo data looks plausible.
    const score = Math.min(
      100,
      (budget.scoreWeight ?? 0) +
        (timeline.scoreWeight ?? 0) +
        (areaSqft >= 2000 ? 15 : 0) +
        (isCommercial ? 10 : 0) +
        10,
    )
    const temperature =
      score >= 80 ? LeadTemperature.HOT : score >= 50 ? LeadTemperature.WARM : LeadTemperature.COLD

    // Spread across the last ~90 days.
    const createdAt = new Date(now - (index * 36 + 6) * 3_600_000)

    await prisma.$transaction(async (tx) => {
      const phone = `+9198${String(76000000 + index * 137).slice(0, 8)}`

      const customer = await tx.customer.create({
        data: {
          fullName: `${firstName} ${lastName}`,
          phone,
          phoneRaw: phone,
          whatsappNumber: index % 3 === 0 ? phone : null,
          email: index % 2 === 0 ? `${firstName.toLowerCase()}.${index}@example.com` : null,
          city,
          state: 'Karnataka',
          firstSource: source,
          createdAt,
        },
      })

      const campaign =
        source === LeadSource.INSTAGRAM && campaigns.length > 0
          ? pick(campaigns, index)
          : undefined

      const assignee = salesUsers.length > 0 ? pick(salesUsers, index) : undefined

      const lead = await tx.lead.create({
        data: {
          leadNumber: await nextLeadNumber(tx, createdAt),
          customerId: customer.id,
          status,
          temperature,
          score,
          scoreBreakdown: [
            { rule: 'budget', label: 'Budget range', points: budget.scoreWeight ?? 0 },
            { rule: 'timeline', label: 'Timeline urgency', points: timeline.scoreWeight ?? 0 },
          ],
          source,
          campaignId: campaign?.id ?? null,
          assignedToId: assignee?.id ?? null,
          assignedAt: assignee ? createdAt : null,
          utmSource: source === LeadSource.INSTAGRAM ? 'instagram' : null,
          utmMedium: source === LeadSource.INSTAGRAM ? 'social' : null,
          utmCampaign: campaign?.code ?? null,
          createdAt,
          statusChangedAt: createdAt,
          wonAt: status === LeadStatus.WON ? createdAt : null,
          lostAt: status === LeadStatus.LOST ? createdAt : null,
          lostReason: status === LeadStatus.LOST ? 'Budget mismatch' : null,
        },
      })

      await tx.leadRequirement.create({
        data: {
          leadId: lead.id,
          propertyType,
          propertyStatus: pick(
            [
              PropertyStatus.NEW_PROPERTY,
              PropertyStatus.READY_TO_MOVE,
              PropertyStatus.RENOVATION,
              PropertyStatus.UNDER_CONSTRUCTION,
            ],
            index,
          ),
          city,
          state: 'Karnataka',
          areaSqft,
          floors: isCommercial ? 1 : ((index % 3) + 1),
          spaceRequirements: (isCommercial ? COMMERCIAL_SPACES : RESIDENTIAL_SPACES).slice(
            0,
            (index % 3) + 1,
          ),
          designStyles: ['modern', 'minimal'].slice(0, (index % 2) + 1),
          budgetKey: budget.key,
          budgetMin: budget.numericMin ?? null,
          budgetMax: budget.numericMax ?? null,
          timelineKey: timeline.key,
          notes:
            index % 4 === 0
              ? 'We are moving in next month and would like the kitchen done first.'
              : null,
        },
      })

      await tx.leadActivity.create({
        data: {
          leadId: lead.id,
          type: ActivityType.LEAD_CREATED,
          title: 'Lead created from website form',
          description: `Scored ${score} (${temperature})`,
          createdAt,
        },
      })

      // Give roughly a third of the open leads a pending follow-up, some of
      // them overdue, so the dashboard's overdue banner is exercised.
      if (assignee && index % 3 === 0 && status !== LeadStatus.WON && status !== LeadStatus.LOST) {
        const scheduledAt = new Date(now + (index % 7 === 0 ? -2 : 3) * 86_400_000)

        await tx.followUp.create({
          data: {
            leadId: lead.id,
            assignedToId: assignee.id,
            createdById: assignee.id,
            type: 'CALL',
            scheduledAt,
            notes: 'Discuss the initial layout.',
          },
        })
        await tx.lead.update({ where: { id: lead.id }, data: { nextFollowUpAt: scheduledAt } })
      }
    })
  }

  console.log(`  ✓ ${DEMO_LEAD_COUNT} demo leads`)
}
