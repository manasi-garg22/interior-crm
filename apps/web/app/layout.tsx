import type { Metadata, Viewport } from 'next'
import './globals.css'

/** Set to "dev" on the test site only. Production leaves it unset. */
const isTestSite = process.env.NEXT_PUBLIC_APP_ENV === 'dev'

const siteUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://www.omarchdesigns.com').replace(/\/$/, '')
const description =
  'OM Arch Designs — interior designers in Vadodara, Gujarat. Home interiors, modular kitchens, offices, cafés and retail, designed and built by one team. Free consultation.'

export const metadata: Metadata = {
  // Lets every page use relative URLs for canonical and social images.
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Interior Designer in Vadodara | OM Arch Designs',
    template: isTestSite ? '[TEST] %s · OM Arch Designs' : '%s · OM Arch Designs',
  },
  description,
  applicationName: 'OM Arch Designs',
  alternates: { canonical: '/' },
  // Link previews on WhatsApp, Instagram, Facebook and LinkedIn.
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    siteName: 'OM Arch Designs',
    title: 'Interior Designer in Vadodara | OM Arch Designs',
    description,
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Interior Designer in Vadodara | OM Arch Designs',
    description,
  },
  // Filled in once Google Search Console issues a token (no DNS needed).
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION } }
    : {}),
  // The test site must never show up in Google next to the real one.
  robots: isTestSite ? { index: false, follow: false } : { index: true, follow: true },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#f7f5f1',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // The class below is set by the inline script before first paint.
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-dvh antialiased">
        {/* Enables scroll-reveal styles only when JS runs; reveals everything
            after 2.5s if the observer never starts, so nothing stays hidden. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "document.documentElement.classList.add('js');window.__revealFallback=setTimeout(function(){document.querySelectorAll('.reveal').forEach(function(e){e.classList.add('is-visible')})},2500)",
          }}
        />
        {isTestSite ? (
          <div
            role="note"
            className="relative z-50 bg-[#f5c518] px-4 py-1.5 text-center text-xs font-medium text-[#1b1a17]"
          >
            TEST SITE — sample data only. Real customers use the live site.
          </div>
        ) : null}
        {children}
      </body>
    </html>
  )
}
