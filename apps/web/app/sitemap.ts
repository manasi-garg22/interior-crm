import type { MetadataRoute } from 'next'
import { getPublicEnv } from '@crm/config'

/**
 * Public pages only. The CRM, login and thank-you pages are deliberately
 * left out — they are either private or meaningless without a submission.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = getPublicEnv().appUrl.replace(/\/$/, '')
  // The test site must not advertise any pages to search engines.
  if (process.env.NEXT_PUBLIC_APP_ENV === 'dev') return []

  return [
    { url: `${base}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/start-project`, changeFrequency: 'monthly', priority: 0.8 },
  ]
}
