import type { Metadata } from 'next'
import { requirePermissionForPage } from '@/lib/server/session'
import { PageHeader } from '@/components/crm/page-header'
import { EstimateBuilder } from '@/components/crm/estimate-builder'

export const metadata: Metadata = { title: 'Cost estimates' }

/**
 * Interior cost estimate builder — prices are internal, so the tool lives
 * inside the CRM behind login rather than on the public site.
 */
export default async function EstimatesPage() {
  // Matches the nav item: sales roles and admins, not designers or viewers.
  await requirePermissionForPage('lead:create', '/estimates')

  return (
    <>
      <PageHeader
        title="Cost estimates"
        description="Add rooms and items, adjust quantities and prices, then download a branded PDF."
      />
      <EstimateBuilder />
    </>
  )
}
