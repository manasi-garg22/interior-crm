import { ButtonLink } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/states'

export default function LeadNotFound() {
  return (
    <EmptyState
      title="Lead not found"
      // Deliberately identical whether the lead does not exist or simply is
      // not assigned to this user — the difference would leak that a lead
      // with that id exists.
      description="It may have been removed, or it may not be assigned to you."
      action={<ButtonLink href="/leads">Back to leads</ButtonLink>}
    />
  )
}
