import type { Metadata } from 'next'
import { PlannedScreen } from '@/components/crm/planned-screen'

export const metadata: Metadata = { title: 'Campaigns' }

export default function Page() {
  return (
    <PlannedScreen
      title="Campaigns"
      phase="Phase 3"
      description="Marketing campaigns and their return."
      capabilities={[
          'Create campaigns with a UTM campaign code',
          'Leads, qualified leads and site visits per campaign',
          'Revenue attributed back to each campaign',
          'Instagram reel to revenue, end to end',
      ]}
    />
  )
}
