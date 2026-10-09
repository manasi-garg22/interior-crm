import type { Metadata } from 'next'
import Link from 'next/link'
import { getPublicEnv } from '@crm/config'
import { getPublicFormOptions } from '@/lib/modules/options/service'
import { ProjectForm } from '@/components/public/project-form'
import { BrandLogo } from '@/components/ui/brand-logo'

export const metadata: Metadata = {
  title: 'Start your project',
  description: 'Tell us about your space and a designer will get in touch.',
  robots: { index: false, follow: true },
}

/** Picklists are admin-editable, so this page must not be cached statically. */
export const dynamic = 'force-dynamic'

export default async function StartProjectPage() {
  const env = getPublicEnv()
  const options = await getPublicFormOptions()

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-[84rem] items-center justify-between px-5 sm:h-20 sm:px-8">
          <BrandLogo companyName={env.companyName} href="/" />
          <Link href="/" className="text-sm text-ink-muted transition-colors hover:text-ink">
            Save and exit
          </Link>
        </div>
      </header>

      <main className="flex-1 px-5 py-10 sm:px-8 sm:py-16">
        <ProjectForm options={options} uploadsEnabled={env.uploadsEnabled} />
      </main>

      <footer className="border-t border-line px-5 py-6 sm:px-8">
        <p className="mx-auto max-w-2xl text-xs leading-relaxed text-ink-muted">
          We use your details only to respond to this enquiry. We never sell or share them.
        </p>
      </footer>
    </div>
  )
}
