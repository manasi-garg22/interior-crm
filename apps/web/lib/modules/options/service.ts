import { OptionSetKey } from '@crm/database'
import * as repository from './repository'

export type PublicFormOption = {
  key: string
  label: string
  category?: string
}

export type PublicFormOptions = {
  budgetRanges: PublicFormOption[]
  timelines: PublicFormOption[]
  designStyles: PublicFormOption[]
  spaceRequirements: PublicFormOption[]
}

/**
 * Picklists for the public consultation form.
 *
 * Note what is NOT returned: scoreWeight and the numeric bounds. Those are
 * scoring inputs, and exposing them would let anyone read off exactly how
 * leads are prioritized.
 */
export async function getPublicFormOptions(): Promise<PublicFormOptions> {
  const sets = await repository.listAllOptionSets()

  const toPublic = (option: repository.OptionRecord): PublicFormOption => ({
    key: option.key,
    label: option.label,
    category:
      typeof option.metadata?.category === 'string' ? option.metadata.category : undefined,
  })

  // An empty set means the seed has not run; the form renders with no
  // choices rather than throwing on an undefined bucket.
  const at = (key: OptionSetKey): PublicFormOption[] => (sets[key] ?? []).map(toPublic)

  return {
    budgetRanges: at(OptionSetKey.BUDGET_RANGE),
    timelines: at(OptionSetKey.TIMELINE),
    designStyles: at(OptionSetKey.DESIGN_STYLE),
    spaceRequirements: at(OptionSetKey.SPACE_REQUIREMENT),
  }
}
