import { describe, expect, it } from 'vitest'
import { scoreLead, temperatureFor, type ScoringInput } from '@crm/config'

const BASE: ScoringInput = {
  budgetWeight: 0,
  timelineWeight: 0,
  areaSqft: null,
  hasWhatsApp: false,
  phoneVerified: false,
  isCommercial: false,
}

describe('lead scoring', () => {
  it('scores the worked example from the requirements as HOT', () => {
    // ₹50 Lakh+ (30) + immediately (25) + 2500 sq ft (15) + commercial (10)
    // + WhatsApp (5) + phone verified (5) = 90
    const result = scoreLead({
      budgetWeight: 30,
      timelineWeight: 25,
      areaSqft: 2500,
      hasWhatsApp: true,
      phoneVerified: true,
      isCommercial: true,
    })

    expect(result.score).toBe(90)
    expect(result.temperature).toBe('HOT')
  })

  it('scores a bare enquiry as COLD', () => {
    const result = scoreLead(BASE)
    expect(result.score).toBe(0)
    expect(result.temperature).toBe('COLD')
  })

  it('explains every point it awarded', () => {
    const result = scoreLead({ ...BASE, budgetWeight: 30, hasWhatsApp: true })

    expect(result.breakdown).toEqual([
      { rule: 'budget', label: 'Budget range', points: 30 },
      { rule: 'whatsapp', label: 'WhatsApp available', points: 5 },
    ])
    // The breakdown must always reconcile to the total, or the lead page lies.
    expect(result.breakdown.reduce((sum, item) => sum + item.points, 0)).toBe(result.score)
  })

  it('awards the area bonus exactly at the threshold, not below it', () => {
    expect(scoreLead({ ...BASE, areaSqft: 1999 }).score).toBe(0)
    expect(scoreLead({ ...BASE, areaSqft: 2000 }).score).toBe(15)
  })

  it('omits zero-weight rules from the breakdown rather than listing noise', () => {
    const result = scoreLead({ ...BASE, budgetWeight: 0, timelineWeight: 0 })
    expect(result.breakdown).toEqual([])
  })

  it('clamps to 100 so a future rule cannot overflow the bands', () => {
    const result = scoreLead({
      budgetWeight: 80,
      timelineWeight: 80,
      areaSqft: 5000,
      hasWhatsApp: true,
      phoneVerified: true,
      isCommercial: true,
    })
    expect(result.score).toBe(100)
    expect(result.temperature).toBe('HOT')
  })

  it('treats a missing weight as zero rather than NaN', () => {
    const result = scoreLead({ ...BASE, budgetWeight: null, timelineWeight: null })
    expect(result.score).toBe(0)
  })
})

describe('temperature bands', () => {
  it('places each boundary on the documented side', () => {
    expect(temperatureFor(0)).toBe('COLD')
    expect(temperatureFor(49)).toBe('COLD')
    expect(temperatureFor(50)).toBe('WARM')
    expect(temperatureFor(79)).toBe('WARM')
    expect(temperatureFor(80)).toBe('HOT')
    expect(temperatureFor(100)).toBe('HOT')
  })
})
