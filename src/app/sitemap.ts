import type { MetadataRoute } from 'next'

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tutoril.co'

// הדפים הציבוריים העיקריים. פרופילי מורים נמצאים דרך הקישורים מדף החיפוש.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE}/search`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE}/signup`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE}/login`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${SITE}/terms`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE}/privacy`, changeFrequency: 'yearly', priority: 0.2 },
  ]
}
