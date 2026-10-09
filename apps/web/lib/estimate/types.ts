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

export type Estimate = {
  clientName: string
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
