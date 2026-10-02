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
        ],
      },
    ]
  },
}

export default nextConfig
