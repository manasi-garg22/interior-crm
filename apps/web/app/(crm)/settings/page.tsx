import type { Metadata } from 'next'
import { PlannedScreen } from '@/components/crm/planned-screen'

export const metadata: Metadata = { title: 'Settings' }

export default function Page() {
  return (
    <PlannedScreen
      title="Settings"
      phase="Phase 1.7"
      description="Configure the values the business owns."
      capabilities={[
          'Edit budget ranges, timelines and design styles',
          'Manage the room and space lists shown on the form',
          'Tune lead scoring weights',
          'Configure integrations and notification recipients',
      ]}
    />
  )
}
