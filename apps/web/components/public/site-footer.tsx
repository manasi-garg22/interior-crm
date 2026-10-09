import Link from 'next/link'
import { BrandLogo } from '@/components/ui/brand-logo'
import { InstagramIcon, YouTubeIcon } from './social-icons'

export function SiteFooter({
  companyName,
  phone,
  whatsapp,
  email = '',
  address = '',
  portfolioUrl = '',
  instagramUrl = '',
  youtubeUrl = '',
}: {
  companyName: string
  phone: string
  whatsapp: string
  email?: string
  address?: string
  portfolioUrl?: string
  instagramUrl?: string
  youtubeUrl?: string
}) {
  const year = new Date().getFullYear()

  return (
    <footer id="contact" className="border-t border-line bg-surface">
      <div className="mx-auto max-w-[84rem] px-5 py-16 sm:px-8 sm:py-20">
        <div className="grid gap-12 md:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <BrandLogo companyName={companyName} size="lg" />
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-muted">
              Interior design and construction for homes and commercial spaces. Design, execution
              and handover under one roof.
            </p>
            {address ? <p className="mt-4 text-sm text-ink-soft">{address}</p> : null}
          </div>

          <div>
            <p className="eyebrow">Talk to us</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              {/* Never leave this column empty: "Talk to our team" scrolls here. */}
              {!phone && !whatsapp && !email ? (
                <li>
                  <Link href="/start-project" className="text-ink-soft hover:text-ink">
                    Share your details and we will call you back
                  </Link>
                </li>
              ) : null}
              {phone ? (
                <li>
                  <a href={`tel:${phone}`} className="text-ink-soft hover:text-ink">
                    {phone}
                  </a>
                </li>
              ) : null}
              {whatsapp ? (
                <li>
                  <a
                    href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ink-soft hover:text-ink"
                  >
                    WhatsApp
                  </a>
                </li>
              ) : null}
              {email ? (
                <li>
                  <a href={`mailto:${email}`} className="text-ink-soft hover:text-ink">
                    {email}
                  </a>
                </li>
              ) : null}
              {instagramUrl ? (
                <li>
                  <a
                    href={instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-ink-soft transition-colors hover:text-ink"
                  >
                    <InstagramIcon className="size-4" />
                    Instagram
                  </a>
                </li>
              ) : null}
              {youtubeUrl ? (
                <li>
                  <a
                    href={youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-ink-soft transition-colors hover:text-ink"
                  >
                    <YouTubeIcon className="size-4" />
                    YouTube
                  </a>
                </li>
              ) : null}
            </ul>
          </div>

          <div>
            <p className="eyebrow">Start</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link href="/start-project" className="text-ink-soft hover:text-ink">
                  Start your project
                </Link>
              </li>
              {portfolioUrl ? (
                <li>
                  <a
                    href={portfolioUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ink-soft hover:text-ink"
                  >
                    Portfolio
                  </a>
                </li>
              ) : null}
              <li>
                <Link href="/login" className="text-ink-soft hover:text-ink">
                  Team sign in
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-2 border-t border-line pt-6 text-xs text-ink-muted sm:flex-row sm:justify-between">
          <p>
            © {year} {companyName}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
