import Link from 'next/link'

export function SiteFooter({
  companyName,
  phone,
  whatsapp,
  email = '',
  address = '',
  portfolioUrl = '',
  instagramUrl = '',
}: {
  companyName: string
  phone: string
  whatsapp: string
  email?: string
  address?: string
  portfolioUrl?: string
  instagramUrl?: string
}) {
  const year = new Date().getFullYear()

  return (
    <footer id="contact" className="border-t border-line bg-surface">
      <div className="mx-auto max-w-[84rem] px-5 py-16 sm:px-8 sm:py-20">
        <div className="grid gap-12 md:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <p className="font-display text-2xl tracking-tight">{companyName}</p>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-muted">
              Interior design and construction for homes and commercial spaces. Design, execution
              and handover under one roof.
            </p>
            {address ? <p className="mt-4 text-sm text-ink-soft">{address}</p> : null}
          </div>

          <div>
            <p className="eyebrow">Talk to us</p>
            <ul className="mt-4 space-y-2.5 text-sm">
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
                    className="text-ink-soft hover:text-ink"
                  >
                    Instagram
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
