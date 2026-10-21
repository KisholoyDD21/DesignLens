import type { MetadataRoute } from 'next';

const siteOrigin = new URL(process.env.SITE_URL || 'https://design-lens-tayw.vercel.app');
if (process.env.NODE_ENV === 'production') siteOrigin.protocol = 'https:';
const SITE_URL = siteOrigin.origin.replace(/\/$/, '');

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: SITE_URL, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];
}
