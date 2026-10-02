import { TEMPERATURE_THRESHOLDS } from './constants'

/**
 * Rule-based lead scoring.
 *
 * A pure function: same inputs, same score, no database and no clock. That is
 * what makes it exhaustively testable, and it is why the caller passes in the
 * budget and timeline weights (read from the admin-editable OptionValue rows)
 * rather than this module looking them up.
 *
 * The breakdown is returned alongside the total so the lead page can show a
 * salesperson *why* something scored 85 instead of an unexplained number.
 */

export type ScoringInput = {
  /** OptionValue.scoreWeight for the chosen budget band. */
  budgetWeight: number | null
  /** OptionValue.scoreWeight for the chosen timeline. */
  timelineWeight: number | null
  areaSqft: number | null
  hasWhatsApp: boolean
  phoneVerified: boolean
  isCommercial: boolean
}

export type ScoreContribution = {
  rule: string
  label: string
  points: number
}

export type ScoringResult = {
  score: number
  temperature: 'HOT' | 'WARM' | 'COLD'
  breakdown: ScoreContribution[]
}

/** Non-configurable weights. Budget and timeline weights come from the database. */
export const SCORING_RULES = {
  largeAreaSqft: { threshold: 2000, points: 15 },
  whatsAppAvailable: { points: 5 },
  phoneVerified: { points: 5 },
  commercialProject: { points: 10 },
} as const

export function scoreLead(input: ScoringInput): ScoringResult {
  const breakdown: ScoreContribution[] = []

  if (input.budgetWeight && input.budgetWeight > 0) {
    breakdown.push({ rule: 'budget', label: 'Budget range', points: input.budgetWeight })
  }

  if (input.timelineWeight && input.timelineWeight > 0) {
    breakdown.push({ rule: 'timeline', label: 'Timeline urgency', points: input.timelineWeight })
  }

  if (input.areaSqft != null && input.areaSqft >= SCORING_RULES.largeAreaSqft.threshold) {
    breakdown.push({
      rule: 'area',
      label: `Area ${SCORING_RULES.largeAreaSqft.threshold}+ sq ft`,
      points: SCORING_RULES.largeAreaSqft.points,
    })
  }

  if (input.isCommercial) {
    breakdown.push({
      rule: 'commercial',
      label: 'Commercial project',
      points: SCORING_RULES.commercialProject.points,
    })
  }

  if (input.hasWhatsApp) {
    breakdown.push({
      rule: 'whatsapp',
      label: 'WhatsApp available',
      points: SCORING_RULES.whatsAppAvailable.points,
    })
  }

  if (input.phoneVerified) {
    breakdown.push({
      rule: 'phone',
      label: 'Phone verified',
      points: SCORING_RULES.phoneVerified.points,
    })
  }

  const raw = breakdown.reduce((total, item) => total + item.points, 0)
  // Clamped: the bands below assume a 0–100 scale, and adding a new rule
  // must not silently push every lead into HOT.
  const score = Math.max(0, Math.min(100, raw))

  return { score, temperature: temperatureFor(score), breakdown }
}

export function temperatureFor(score: number): 'HOT' | 'WARM' | 'COLD' {
  if (score >= TEMPERATURE_THRESHOLDS.hot) return 'HOT'
  if (score >= TEMPERATURE_THRESHOLDS.warm) return 'WARM'
  return 'COLD'
}
