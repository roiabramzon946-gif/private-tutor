import type { MetadataRoute } from 'next'

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tutoril.co'

// מה מנועי חיפוש רשאים לסרוק. דפים אישיים (צ'אט, אזור אישי) לא נסרקים.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard', '/messages', '/requests', '/auth', '/reset-password', '/api'],
    },
    sitemap: `${SITE}/sitemap.xml`,
  }
}
