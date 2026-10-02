import type { Metadata } from 'next'
import { PlannedScreen } from '@/components/crm/planned-screen'

export const metadata: Metadata = { title: 'Projects' }

export default function Page() {
  return (
    <PlannedScreen
      title="Projects"
      phase="Phase 5"
      description="Won leads converted into delivery projects."
      capabilities={[
          'Convert a WON lead into a numbered project',
          'Track planning, design, execution and completion',
          'Estimated value, area and schedule dates',
          'Documents and drawings per project',
      ]}
    />
  )
}
