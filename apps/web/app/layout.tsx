import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'OMA Designs — Interior Design & Construction in Vadodara',
    template: '%s · OMA Designs',
  },
  description:
    'OMA Designs — residential and commercial interior design and construction in Vadodara, Gujarat. Considered spaces, delivered end to end.',
  robots: { index: true, follow: true },
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
    <html lang="en">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  )
}
