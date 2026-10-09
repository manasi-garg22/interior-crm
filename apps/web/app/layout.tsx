import type { Metadata, Viewport } from 'next'
import './globals.css'

/** Set to "dev" on the test site only. Production leaves it unset. */
const isTestSite = process.env.NEXT_PUBLIC_APP_ENV === 'dev'

export const metadata: Metadata = {
  title: {
    default: 'OMA Designs — Interior Design & Construction in Vadodara',
    template: isTestSite ? '[TEST] %s · OMA Designs' : '%s · OMA Designs',
  },
  description:
    'OM Arch Designs (OMA Designs) — residential and commercial interior design and construction in Vadodara, Gujarat. Considered spaces, delivered end to end.',
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
