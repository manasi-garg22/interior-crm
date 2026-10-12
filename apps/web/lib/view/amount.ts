/**
 * Parses a rupee amount typed by a person: "12,50,000", "₹ 1250000" or
 * "1250000.50". Returns null for anything that is not a positive amount
 * with at most two decimals.
 */
export function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[₹,\s]/g, '')
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null
  const value = Number(cleaned)
  return value > 0 && value <= 10_000_000_000 ? value : null
}

/** Short Indian-style figure for stat cards: ₹85,000 · ₹12.5 L · ₹1.25 Cr. */
export function formatInrCompact(value: number): string {
  const trim = (n: number): string => String(Math.round(n * 100) / 100)
  if (value >= 10_000_000) return `₹${trim(value / 10_000_000)} Cr`
  if (value >= 100_000) return `₹${trim(value / 100_000)} L`
  return `₹${Math.round(value).toLocaleString('en-IN')}`
}
