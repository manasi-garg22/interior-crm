import type { MetadataRoute } from 'next'
import { getPublicEnv } from '@crm/config'

/** Lets search engines in to the public site and keeps them out of the CRM. */
export default function robots(): MetadataRoute.Robots {
  // Test site: block everything, belt and braces with the noindex header.
  if (process.env.NEXT_PUBLIC_APP_ENV === 'dev') {
    return { rules: { userAgent: '*', disallow: '/' } }
  }

  const base = getPublicEnv().appUrl.replace(/\/$/, '')
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/dashboard',
        '/leads',
        '/pipeline',
        '/follow-ups',
        '/customers',
        '/estimates',
        '/projects',
        '/campaigns',
        '/analytics',
        '/users',
        '/settings',
        '/login',
        '/forgot-password',
        '/reset-password',
        '/thank-you',
      ],
    },
    sitemap: `${base}/sitemap.xml`,
  }
}
