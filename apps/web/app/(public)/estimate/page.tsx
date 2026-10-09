import type { Metadata } from 'next'
import Link from 'next/link'
import { getPublicEnv } from '@crm/config'
import { BrandLogo } from '@/components/ui/brand-logo'
import { EstimateBuilder } from '@/components/crm/estimate-builder'

/**
 * Public cost-estimate builder — opens without a login so the team can use
 * it on any phone or laptop.
 *
 * Safe to expose because it touches no server data: estimates live only in
 * the visitor's own browser, and the PDF is generated on their device.
 * Hidden from search engines (noindex + robots.txt) so customers do not stumble on it.
 */
export const metadata: Metadata = {
  title: 'Cost estimate',
  description: 'Interior cost estimate builder — OM Arch Designs.',
  robots: { index: false, follow: false },
}

export default function PublicEstimatePage() {
  const env = getPublicEnv()

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-16 max-w-[84rem] items-center justify-between px-5 sm:h-20 sm:px-8">
          <BrandLogo companyName={env.companyName} href="/" />
          <Link href="/" className="text-sm text-ink-muted transition-colors hover:text-ink">
            Back to website
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[84rem] flex-1 px-4 py-8 sm:px-8 sm:py-12">
        <div className="mb-8">
          <p className="eyebrow">Interior cost estimate</p>
          <h1 className="mt-3 font-display text-[1.9rem] tracking-tight sm:text-title">
            Build a quotation
          </h1>
          <p className="mt-2 max-w-2xl text-ink-muted">
            Add rooms and items, adjust quantities and prices, preview the PDF and download it.
            Everything stays on this device.
          </p>
        </div>
        <EstimateBuilder />
      </main>
    </div>
  )
}
