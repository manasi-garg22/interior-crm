import { getPublicEnv } from '@crm/config'

/**
 * Structured data for search engines. Rendered as a JSON-LD <script>, with
 * `<` escaped so no string inside can close the tag early.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  )
}

export function siteUrl(): string {
  return getPublicEnv().appUrl.replace(/\/$/, '')
}

/** The business itself — what Google uses for knowledge panels and local results. */
export function businessJsonLd(): Record<string, unknown> {
  const env = getPublicEnv()
  const base = siteUrl()
  return {
    '@context': 'https://schema.org',
    '@type': 'HomeAndConstructionBusiness',
    '@id': `${base}/#business`,
    name: env.companyFullName,
    alternateName: env.companyName,
    url: `${base}/`,
    logo: `${base}/brand/om-arch-logo.svg`,
    image: `${base}/images/hero.jpg`,
    description:
      'Interior design and construction studio in Vadodara, Gujarat — homes, modular kitchens, offices, cafés and retail, from design to handover.',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Vadodara',
      addressRegion: 'Gujarat',
      addressCountry: 'IN',
    },
    areaServed: [
      { '@type': 'City', name: 'Vadodara' },
      { '@type': 'State', name: 'Gujarat' },
    ],
    knowsAbout: [
      'Interior design',
      'Home interiors',
      'Modular kitchens',
      'Office interiors',
      'Restaurant and café interiors',
      'Renovation',
    ],
    sameAs: [env.instagramUrl, env.youtubeUrl].filter(Boolean),
  }
}
