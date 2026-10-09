import Link from 'next/link'
import { BrandLogo } from '@/components/ui/brand-logo'
import { ButtonLink } from '@/components/ui/button'

export function SiteHeader({ companyName }: { companyName: string }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-canvas/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[84rem] items-center justify-between px-5 sm:h-20 sm:px-8">
        <BrandLogo companyName={companyName} href="/" />

        <nav className="hidden items-center gap-9 text-sm text-ink-soft md:flex">
          {/* Root-relative, so these also work from the service pages. */}
          <Link href="/#work" className="transition-colors hover:text-ink">
            Work
          </Link>
          <Link href="/#services" className="transition-colors hover:text-ink">
            Services
          </Link>
          <Link href="/#process" className="transition-colors hover:text-ink">
            Process
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/#contact"
            className="hidden text-sm text-ink-soft transition-colors hover:text-ink sm:inline"
          >
            Talk to our team
          </Link>
          <ButtonLink href="/start-project" size="sm">
            Start Your Project
          </ButtonLink>
        </div>
      </div>
    </header>
  )
}
