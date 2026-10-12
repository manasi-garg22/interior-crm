import { LeadStatus, type Prisma } from '@crm/database'
import type { LeadFilters } from '@crm/validation'
import type { SessionUser } from '@/lib/server/session'
import { buildWhere } from './list'
import * as repository from './repository'

/**
 * Kanban board data.
 *
 * Columns are capped: a board that tries to render 4,000 NEW leads as cards
 * will lock the browser. Each column loads the most recent
 * `CARDS_PER_COLUMN` and reports the true total so the UI can say
 * "showing 50 of 312".
 */

export const PIPELINE_COLUMNS: LeadStatus[] = [
  LeadStatus.NEW,
  LeadStatus.CONTACTED,
  LeadStatus.QUALIFIED,
  LeadStatus.CONSULTATION,
  LeadStatus.SITE_VISIT,
  LeadStatus.QUOTATION,
  LeadStatus.DESIGN,
  LeadStatus.NEGOTIATION,
  LeadStatus.WON,
  LeadStatus.LOST,
]

const CARDS_PER_COLUMN = 50

export type PipelineCard = {
  id: string
  leadNumber: string
  customerName: string
  city: string | null
  temperature: string
  score: number
  assigneeName: string | null
  budgetLabel: string | null
  /** Locked deal value, once the lead has been won. */
  wonValue: number | null
}

export type PipelineColumn = {
  status: LeadStatus
  total: number
  cards: PipelineCard[]
}

/**
 * `filters` are the same as the leads list (search, temperature, owner,
 * city, dates…). Its status filter is ignored: the columns are the statuses.
 * buildWhere also applies the row-level scope for sales executives.
 */
export async function getPipeline(
  user: SessionUser,
  filters: LeadFilters,
): Promise<PipelineColumn[]> {
  const base = buildWhere({ ...filters, status: undefined }, user)

  const columns = await Promise.all(
    PIPELINE_COLUMNS.map(async (status) => {
      const where: Prisma.LeadWhereInput = { AND: [base, { status }] }

      const [total, rows] = await Promise.all([
        repository.countLeads(where),
        repository.listLeads(where, { updatedAt: 'desc' }, 0, CARDS_PER_COLUMN),
      ])

      return {
        status,
        total,
        cards: rows.map(toCard),
      }
    }),
  )

  return columns
}

type Row = Awaited<ReturnType<typeof repository.listLeads>>[number]

function toCard(row: Row): PipelineCard {
  return {
    id: row.id,
    leadNumber: row.leadNumber,
    customerName: row.customer.fullName,
    city: row.customer.city,
    temperature: row.temperature,
    score: row.score,
    assigneeName: row.assignedTo?.name ?? null,
    budgetLabel: formatBudget(row.requirement?.budgetMin, row.requirement?.budgetMax),
    wonValue: row.wonValue != null ? Number(row.wonValue) : null,
  }
}

function formatBudget(min: unknown, max: unknown): string | null {
  const toLakh = (value: unknown): number | null =>
    value == null ? null : Math.round(Number(value) / 100_000)

  const low = toLakh(min)
  const high = toLakh(max)

  if (low == null && high == null) return null
  if (low == null) return `<₹${high}L`
  if (high == null) return `₹${low}L+`
  return `₹${low}–${high}L`
}
