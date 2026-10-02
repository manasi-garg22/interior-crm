import type { Metadata } from 'next'
import { PlannedScreen } from '@/components/crm/planned-screen'

export const metadata: Metadata = { title: 'Analytics' }

export default function Page() {
  return (
    <PlannedScreen
      title="Analytics"
      phase="Phase 3"
      description="Conversion and revenue reporting."
      capabilities={[
          'Funnel conversion from lead to won project',
          'Breakdowns by source, campaign, city and salesperson',
          'Revenue per source and cost per qualified lead',
          'Month-on-month trends',
      ]}
    />
  )
}
