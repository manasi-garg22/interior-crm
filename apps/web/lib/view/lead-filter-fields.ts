import type { FilterField, FilterOption } from './list-filters'

/** Filter-bar definitions shared by the leads list and the pipeline board. */

const titleCase = (value: string): string =>
  value
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

const toOptions = (values: readonly string[]): FilterOption[] =>
  values.map((value) => ({ value, label: titleCase(value) }))

export const LEAD_STATUS_VALUES = [
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'CONSULTATION',
  'SITE_VISIT',
  'QUOTATION',
  'DESIGN',
  'NEGOTIATION',
  'WON',
  'LOST',
  'ON_HOLD',
] as const

const TEMPERATURES = ['HOT', 'WARM', 'COLD'] as const
const SOURCES = [
  'INSTAGRAM',
  'FACEBOOK',
  'GOOGLE',
  'WEBSITE',
  'WHATSAPP',
  'REFERRAL',
  'DIRECT',
  'OTHER',
] as const

const SORTS: FilterOption[] = [
  { value: 'createdAt:asc', label: 'Oldest first' },
  { value: 'updatedAt:desc', label: 'Recently updated' },
  { value: 'score:desc', label: 'Highest score' },
  { value: 'nextFollowUpAt:asc', label: 'Next follow-up' },
]

export function leadFilterFields(options: {
  assignees: { id: string; name: string }[]
  canFilterByAssignee: boolean
  budgets: { key: string; label: string }[]
  /** The pipeline's columns already are the statuses. */
  includeStatus?: boolean
  includeSort?: boolean
}): FilterField[] {
  const fields: FilterField[] = []

  if (options.includeStatus !== false) {
    fields.push({
      kind: 'multi',
      key: 'status',
      label: 'Status',
      options: toOptions(LEAD_STATUS_VALUES),
    })
  }

  fields.push(
    { kind: 'multi', key: 'temperature', label: 'Temperature', options: toOptions(TEMPERATURES) },
    { kind: 'multi', key: 'source', label: 'Source', options: toOptions(SOURCES) },
  )

  if (options.canFilterByAssignee) {
    fields.push({
      kind: 'select',
      key: 'assignedToId',
      label: 'Owner',
      anyLabel: 'Owner: anyone',
      options: [
        { value: 'unassigned', label: 'Unassigned' },
        ...options.assignees.map((person) => ({ value: person.id, label: person.name })),
      ],
    })
  }

  if (options.budgets.length > 0) {
    fields.push({
      kind: 'select',
      key: 'budgetKey',
      label: 'Budget',
      options: options.budgets.map((budget) => ({ value: budget.key, label: budget.label })),
    })
  }

  fields.push(
    { kind: 'text', key: 'city', label: 'City', placeholder: 'City' },
    { kind: 'date', key: 'createdFrom', label: 'From' },
    { kind: 'date', key: 'createdTo', label: 'To' },
    { kind: 'toggle', key: 'overdue', label: 'Follow-up overdue' },
  )

  if (options.includeSort !== false) {
    fields.push({
      kind: 'select',
      key: 'sort',
      label: 'Sort',
      anyLabel: 'Newest first',
      options: SORTS,
    })
  }

  return fields
}
