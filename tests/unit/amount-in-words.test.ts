import { describe, expect, it } from 'vitest'
import { amountInWords } from '../../apps/web/lib/estimate/types'

describe('amount in words (Indian numbering, for bills)', () => {
  it('spells lakhs and thousands', () => {
    expect(amountInWords(179400)).toBe('Rupees One Lakh Seventy Nine Thousand Four Hundred Only')
  })

  it('spells crores', () => {
    expect(amountInWords(12500000)).toBe('Rupees One Crore Twenty Five Lakh Only')
  })

  it('handles teens, round hundreds and paise', () => {
    expect(amountInWords(1015.5)).toBe('Rupees One Thousand Fifteen and Fifty Paise Only')
    expect(amountInWords(700)).toBe('Rupees Seven Hundred Only')
  })

  it('handles zero', () => {
    expect(amountInWords(0)).toBe('Rupees Zero Only')
  })
})
