import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPublicEnv } from '@crm/config'
import { ButtonLink } from '@/components/ui/button'
import { Photo } from '@/components/public/photo'
import { SiteHeader } from '@/components/public/site-header'
import { SiteFooter } from '@/components/public/site-footer'
import { RevealObserver } from '@/components/public/reveal-observer'
import { JsonLd, siteUrl } from '@/components/public/json-ld'
import { SERVICES, findService } from '@/lib/seo/services'

/** Every service page is known at build time; anything else is a 404. */
export const dynamicParams = false

export function generateStaticParams() {
  return SERVICES.map((service) => ({ slug: service.slug }))
}

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await props.params
  const service = findService(slug)
  if (!service) return {}
  return {
    title: service.title,
    description: service.description,
    alternates: { canonical: `/services/${service.slug}` },
    openGraph: {
      title: `${service.title} · OM Arch Designs`,
      description: service.description,
      url: `/services/${service.slug}`,
      images: [{ url: service.image, width: 1600, height: 1067, alt: service.imageAlt }],
    },
  }
}

export default async function ServicePage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params
  const service = findService(slug)
  if (!service) notFound()

  const env = getPublicEnv()
  const base = siteUrl()
  const others = SERVICES.filter((s) => s.slug !== service.slug)

  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Service',
        name: service.name,
        serviceType: service.name,
        description: service.description,
        url: `${base}/services/${service.slug}`,
        image: `${base}${service.image}`,
        provider: { '@id': `${base}/#business` },
        areaServed: { '@type': 'City', name: 'Vadodara' },
      },
      {
        '@type': 'FAQPage',
        mainEntity: service.faqs.map((faq) => ({
          '@type': 'Question',
          name: faq.q,
          acceptedAnswer: { '@type': 'Answer', text: faq.a },
        })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${base}/` },
          { '@type': 'ListItem', position: 2, name: 'Services', item: `${base}/#services` },
          { '@type': 'ListItem', position: 3, name: service.name, item: `${base}/services/${service.slug}` },
        ],
      },
    ],
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <JsonLd data={structuredData} />
      <RevealObserver />
      <SiteHeader companyName={env.companyName} />

      <main className="flex-1">
        {/* ── Hero ───────────────────────────────────────── */}
        <section className="mx-auto max-w-[84rem] px-5 pb-14 pt-10 sm:px-8 sm:pb-20 sm:pt-14">
          <nav aria-label="Breadcrumb" className="hero-in text-sm text-ink-muted">
            <Link href="/" className="hover:text-ink">
              Home
            </Link>
            <span aria-hidden className="mx-2">/</span>
            <Link href="/#services" className="hover:text-ink">
              Services
            </Link>
            <span aria-hidden className="mx-2">/</span>
            <span className="text-ink-soft">{service.name}</span>
          </nav>

          <div className="mt-8 grid items-center gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
            <div>
              <p className="eyebrow hero-in">{service.name} · Vadodara</p>
              <h1
                className="hero-in mt-5 font-display text-[2.4rem] leading-[1.08] tracking-[-0.02em] sm:text-hero"
                style={{ '--delay': '120ms' } as React.CSSProperties}
              >
                {service.h1}
              </h1>
              <p
                className="hero-in mt-6 max-w-lg text-lg leading-relaxed text-ink-soft"
                style={{ '--delay': '260ms' } as React.CSSProperties}
              >
                {service.intro}
              </p>
              <div
                className="hero-in mt-9 flex flex-col gap-3 sm:flex-row"
                style={{ '--delay': '400ms' } as React.CSSProperties}
              >
                <ButtonLink href="/start-project" size="lg" className="w-full sm:w-auto">
                  Get a free consultation
                </ButtonLink>
                <ButtonLink href="/#work" size="lg" variant="secondary" className="w-full sm:w-auto">
                  See our work
                </ButtonLink>
              </div>
            </div>

            <Photo
              src={service.image}
              alt={service.imageAlt}
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="aspect-[4/3] w-full"
              imageClassName="hero-photo"
            />
          </div>
        </section>

        {/* ── What's included ─────────────────────────────── */}
        <section className="border-y border-line bg-surface">
          <div className="mx-auto grid max-w-[84rem] gap-12 px-5 py-16 sm:px-8 sm:py-20 md:grid-cols-2">
            <div className="reveal">
              <p className="eyebrow">What&apos;s included</p>
              <h2 className="mt-4 font-display text-title">One team, every trade.</h2>
              <ul className="mt-8 space-y-3.5">
                {service.includes.map((item) => (
                  <li key={item} className="flex items-baseline gap-3 text-[0.9375rem] text-ink-soft">
                    <span aria-hidden className="h-px w-4 shrink-0 bg-accent" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="reveal" style={{ '--delay': '150ms' } as React.CSSProperties}>
              <p className="eyebrow">Ideal for</p>
              <h2 className="mt-4 font-display text-title">Projects we take on.</h2>
              <ul className="mt-8 space-y-3.5">
                {service.idealFor.map((item) => (
                  <li key={item} className="flex items-baseline gap-3 text-[0.9375rem] text-ink-soft">
                    <span aria-hidden className="h-px w-4 shrink-0 bg-line-strong" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── FAQ ─────────────────────────────────────────── */}
        <section className="mx-auto max-w-3xl px-5 py-16 sm:px-8 sm:py-24">
          <div className="reveal">
            <p className="eyebrow">Questions</p>
            <h2 className="mt-4 font-display text-title">Frequently asked.</h2>
          </div>
          <div className="mt-8 divide-y divide-line border-y border-line">
            {service.faqs.map((faq) => (
              <details key={faq.q} className="reveal group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-[1.0625rem] font-medium">
                  {faq.q}
                  <span
                    aria-hidden
                    className="text-xl text-ink-muted transition-transform duration-300 group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 leading-relaxed text-ink-soft">{faq.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ── Other services ──────────────────────────────── */}
        <section className="border-t border-line bg-surface">
          <div className="mx-auto max-w-[84rem] px-5 py-16 sm:px-8 sm:py-20">
            <p className="eyebrow reveal">Also from OM Arch Designs</p>
            <div className="mt-8 grid gap-5 sm:grid-cols-3">
              {others.map((other, index) => (
                <Link
                  key={other.slug}
                  href={`/services/${other.slug}`}
                  className="reveal group block"
                  style={{ '--delay': `${index * 110}ms` } as React.CSSProperties}
                >
                  <Photo src={other.image} alt={other.imageAlt} className="aspect-[4/3] w-full" />
                  <p className="mt-3 font-medium transition-colors group-hover:text-accent">
                    {other.name} →
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ─────────────────────────────────────────── */}
        <section className="bg-ink text-ink-inverse">
          <div className="reveal mx-auto flex max-w-[84rem] flex-col items-start gap-8 px-5 py-16 sm:px-8 sm:py-20 lg:flex-row lg:items-center lg:justify-between">
            <h2 className="max-w-xl font-display text-[2rem] leading-[1.1] tracking-tight sm:text-[2.5rem]">
              Planning {service.name.toLowerCase()} in Vadodara?
            </h2>
            <ButtonLink href="/start-project" size="lg" variant="inverse">
              Start Your Project
            </ButtonLink>
          </div>
        </section>
      </main>

      <SiteFooter
        companyName={env.companyFullName}
        phone={env.companyPhone}
        whatsapp={env.companyWhatsApp}
        email={env.companyEmail}
        address={env.companyAddress}
        portfolioUrl={env.portfolioUrl}
        instagramUrl={env.instagramUrl}
        youtubeUrl={env.youtubeUrl}
      />
    </div>
  )
}
