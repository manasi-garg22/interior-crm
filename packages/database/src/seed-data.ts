import { OptionSetKey } from '@prisma/client'

/**
 * Initial contents of the admin-editable picklists.
 *
 * These are seeded once, then owned by the business through Settings. Nothing
 * in the application may hardcode these labels or amounts — read them from
 * the OptionValue table.
 *
 * `scoreWeight` is what the lead-scoring engine reads, which is what makes
 * the scoring rules configurable rather than baked into code.
 */

export type SeedOption = {
  setKey: OptionSetKey
  key: string
  label: string
  sortOrder: number
  numericMin?: number
  numericMax?: number
  scoreWeight?: number
  metadata?: Record<string, unknown>
}

/** Amounts in INR. */
export const BUDGET_RANGES: SeedOption[] = [
  { setKey: OptionSetKey.BUDGET_RANGE, key: 'under_5l', label: 'Under ₹5 Lakh', sortOrder: 1, numericMax: 500_000, scoreWeight: 0 },
  { setKey: OptionSetKey.BUDGET_RANGE, key: '5_10l', label: '₹5–10 Lakh', sortOrder: 2, numericMin: 500_000, numericMax: 1_000_000, scoreWeight: 5 },
  { setKey: OptionSetKey.BUDGET_RANGE, key: '10_20l', label: '₹10–20 Lakh', sortOrder: 3, numericMin: 1_000_000, numericMax: 2_000_000, scoreWeight: 10 },
  { setKey: OptionSetKey.BUDGET_RANGE, key: '20_30l', label: '₹20–30 Lakh', sortOrder: 4, numericMin: 2_000_000, numericMax: 3_000_000, scoreWeight: 20 },
  { setKey: OptionSetKey.BUDGET_RANGE, key: '30_50l', label: '₹30–50 Lakh', sortOrder: 5, numericMin: 3_000_000, numericMax: 5_000_000, scoreWeight: 30 },
  { setKey: OptionSetKey.BUDGET_RANGE, key: '50l_plus', label: '₹50 Lakh+', sortOrder: 6, numericMin: 5_000_000, scoreWeight: 30 },
  { setKey: OptionSetKey.BUDGET_RANGE, key: 'not_sure', label: 'Not Sure', sortOrder: 7, scoreWeight: 0 },
]

export const TIMELINES: SeedOption[] = [
  { setKey: OptionSetKey.TIMELINE, key: 'immediately', label: 'Immediately', sortOrder: 1, scoreWeight: 25 },
  { setKey: OptionSetKey.TIMELINE, key: 'within_1_month', label: 'Within 1 month', sortOrder: 2, scoreWeight: 20 },
  { setKey: OptionSetKey.TIMELINE, key: '1_3_months', label: '1–3 months', sortOrder: 3, scoreWeight: 12 },
  { setKey: OptionSetKey.TIMELINE, key: '3_6_months', label: '3–6 months', sortOrder: 4, scoreWeight: 6 },
  { setKey: OptionSetKey.TIMELINE, key: '6_plus_months', label: '6+ months', sortOrder: 5, scoreWeight: 2 },
  { setKey: OptionSetKey.TIMELINE, key: 'just_exploring', label: 'Just exploring', sortOrder: 6, scoreWeight: 0 },
]

export const DESIGN_STYLES: SeedOption[] = [
  'Modern',
  'Minimal',
  'Luxury',
  'Contemporary',
  'Traditional',
  'Industrial',
  'Scandinavian',
  'Premium',
  'Functional',
  'Not Sure',
].map((label, index) => ({
  setKey: OptionSetKey.DESIGN_STYLE,
  key: label.toLowerCase().replace(/\s+/g, '_'),
  label,
  sortOrder: index + 1,
}))

const RESIDENTIAL_SPACES = [
  'Living Room',
  'Bedroom',
  'Kitchen',
  'Bathroom',
  'Dining',
  'Balcony',
  'Kids Room',
  'Pooja Room',
  'Wardrobe',
  'Complete Home',
]

const COMMERCIAL_SPACES = [
  'Reception',
  'Office',
  'Cabin',
  'Meeting Room',
  'Restaurant',
  'Cafe',
  'Retail',
  'Showroom',
  'Hotel',
  'Complete Commercial Space',
]

/**
 * `metadata.category` lets the form show only the relevant list once the
 * customer has picked a property type, without a second round trip.
 */
export const SPACE_REQUIREMENTS: SeedOption[] = [
  ...RESIDENTIAL_SPACES.map((label, index) => ({
    setKey: OptionSetKey.SPACE_REQUIREMENT,
    key: label.toLowerCase().replace(/\s+/g, '_'),
    label,
    sortOrder: index + 1,
    metadata: { category: 'residential' },
  })),
  ...COMMERCIAL_SPACES.map((label, index) => ({
    setKey: OptionSetKey.SPACE_REQUIREMENT,
    key: label.toLowerCase().replace(/\s+/g, '_'),
    label,
    sortOrder: 100 + index,
    metadata: { category: 'commercial' },
  })),
]

export const LOST_REASONS: SeedOption[] = [
  'Budget mismatch',
  'Timeline mismatch',
  'Chose a competitor',
  'No response',
  'Not a serious enquiry',
  'Outside service area',
  'Other',
].map((label, index) => ({
  setKey: OptionSetKey.LOST_REASON,
  key: label.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
  label,
  sortOrder: index + 1,
}))

export const ALL_SEED_OPTIONS: SeedOption[] = [
  ...BUDGET_RANGES,
  ...TIMELINES,
  ...DESIGN_STYLES,
  ...SPACE_REQUIREMENTS,
  ...LOST_REASONS,
]
