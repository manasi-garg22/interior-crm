import type { Metadata } from 'next'
import { PlannedScreen } from '@/components/crm/planned-screen'

export const metadata: Metadata = { title: 'Users & Roles' }

export default function Page() {
  return (
    <PlannedScreen
      title="Users & Roles"
      phase="Phase 1.7"
      description="Team members and their permissions."
      capabilities={[
          'Invite and deactivate team members',
          'Assign roles across the six permission levels',
          'Set the reporting line for each salesperson',
          'Deactivation revokes live sessions immediately',
      ]}
    />
  )
}
