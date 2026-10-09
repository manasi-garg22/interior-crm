import type { NextConfig } from 'next'

/**
 * Workspace packages are consumed as TypeScript source (no build step), so
 * Next has to transpile them itself.
 */
const workspacePackages = [
  '@crm/config',
  '@crm/types',
  '@crm/validation',
  '@crm/database',
  '@crm/storage',
  '@crm/email',
  '@crm/whatsapp',
  '@crm/meta',
]

const nextConfig: NextConfig = {
  transpilePackages: workspacePackages,

  // Prisma must not be bundled — it loads a native query engine at runtime.
  serverExternalPackages: ['@prisma/client', '.prisma/client', '@node-rs/argon2'],

  reactStrictMode: true,
  poweredByHeader: false,

  // Lets RBAC call unauthorized() / forbidden() instead of hand-rolled redirects.
  experimental: {
    authInterrupts: true,
  },

  /**
   * The previous omarchdesigns.com site had these pages, and Google still
   * lists them. Permanent redirects send those visitors (and the search
   * ranking) to the matching section instead of a 404.
   */
  async redirects() {
    const old = [
      { source: '/about', destination: '/#services' },
      { source: '/services', destination: '/#services' },
      { source: '/gallery', destination: '/#work' },
      { source: '/team', destination: '/#process' },
      { source: '/contact', destination: '/start-project' },
      { source: '/index', destination: '/' },
    ]
    // Old URLs sometimes carried .php / .html, or a trailing path.
    return old.flatMap(({ source, destination }) => [
      { source, destination, permanent: true },
      { source: `${source}.:ext(php|html|htm)`, destination, permanent: true },
      { source: `${source}/:rest*`, destination, permanent: true },
    ])
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
          },
          // Belt and braces with the robots meta tag: keep the test site out of search.
          ...(process.env.NEXT_PUBLIC_APP_ENV === 'dev'
            ? [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }]
            : []),
        ],
      },
    ]
  },
}

export default nextConfig
