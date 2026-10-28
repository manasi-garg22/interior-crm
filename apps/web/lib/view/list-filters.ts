/** Shape of a filter-bar control; rendered by components/crm/list-filters. */

export type FilterOption = { value: string; label: string }

export type FilterField =
  | { kind: 'select'; key: string; label: string; options: FilterOption[]; anyLabel?: string }
  | { kind: 'multi'; key: string; label: string; options: FilterOption[] }
  | { kind: 'text'; key: string; label: string; placeholder?: string }
  | { kind: 'date'; key: string; label: string }
  | { kind: 'month'; key: string; label: string }
  | { kind: 'toggle'; key: string; label: string }
