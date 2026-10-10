/**
 * Interior cost estimate — the data the builder edits and the PDF prints.
 * Kept in the browser (localStorage) only: estimates are drafts the team
 * prepares and sends, not CRM records.
 */

export type EstimateItem = {
  id: string
  roomType: string
  name: string
  quantity: number
  unit: string
  price: number
}

/** Which PDF to produce from the same items. */
export type DocumentKind = 'estimate' | 'bill'

export type Estimate = {
  clientName: string
  /** Printed on bills only; optional. */
  billNumber?: string
  /** yyyy-mm-dd, as an <input type="date"> produces. */
  date: string
  remarks: string
  items: EstimateItem[]
}

export const ROOM_TYPES = [
  'Kitchen',
  'Living Room',
  'Master Bedroom',
  'Bedroom',
  'Bathroom',
  'Dining Room',
  'Balcony',
  'Study Room',
  'Pooja Room',
] as const

export const UNITS = ['Nos', 'Sq.ft', 'Sq.m', 'Rft', 'Set', 'Lump Sum'] as const

export function lineTotal(item: Pick<EstimateItem, 'quantity' | 'price'>): number {
  return item.quantity * item.price
}

export function grandTotal(items: EstimateItem[]): number {
  return items.reduce((sum, item) => sum + lineTotal(item), 0)
}

/** Items grouped by room, in the order each room first appears. */
export function groupByRoom(items: EstimateItem[]): { roomType: string; items: EstimateItem[]; subtotal: number }[] {
  const groups = new Map<string, EstimateItem[]>()
  for (const item of items) {
    const list = groups.get(item.roomType) ?? []
    list.push(item)
    groups.set(item.roomType, list)
  }
  return [...groups.entries()].map(([roomType, list]) => ({
    roomType,
    items: list,
    subtotal: grandTotal(list),
  }))
}

export function formatInr(value: number): string {
  return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/** The PDF's built-in font has no ₹ glyph, so the PDF prints "Rs." instead. */
export function formatRs(value: number): string {
  return `Rs. ${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

function belowHundred(n: number): string {
  if (n < 20) return ONES[n] ?? ''
  const unit = n % 10
  return `${TENS[Math.floor(n / 10)] ?? ''}${unit ? ` ${ONES[unit]}` : ''}`
}

function belowThousand(n: number): string {
  const hundreds = Math.floor(n / 100)
  const rest = n % 100
  return [hundreds ? `${ONES[hundreds]} Hundred` : '', rest ? belowHundred(rest) : ''].filter(Boolean).join(' ')
}

/**
 * Indian-system amount in words for bills, e.g. 179400.5 →
 * "Rupees One Lakh Seventy Nine Thousand Four Hundred and Fifty Paise Only".
 */
export function amountInWords(value: number): string {
  const rounded = Math.round(Math.max(0, value) * 100)
  let rupees = Math.floor(rounded / 100)
  const paise = rounded % 100

  const parts: string[] = []
  const crore = Math.floor(rupees / 1_00_00_000)
  rupees %= 1_00_00_000
  const lakh = Math.floor(rupees / 1_00_000)
  rupees %= 1_00_000
  const thousand = Math.floor(rupees / 1000)
  rupees %= 1000

  // Crores can exceed 99, so they are spelled with the full lakh/thousand logic.
  if (crore) parts.push(`${crore >= 100 ? amountInWords(crore).replace(/^Rupees | Only$/g, '') : belowHundred(crore)} Crore`)
  if (lakh) parts.push(`${belowHundred(lakh)} Lakh`)
  if (thousand) parts.push(`${belowHundred(thousand)} Thousand`)
  if (rupees) parts.push(belowThousand(rupees))

  const rupeeText = parts.length ? parts.join(' ') : 'Zero'
  const paiseText = paise ? ` and ${belowHundred(paise)} Paise` : ''
  return `Rupees ${rupeeText}${paiseText} Only`
}
