import type { MetadataRoute } from 'next';

const siteOrigin = new URL(process.env.SITE_URL || 'https://designlens-p9yd.onrender.com');
if (process.env.NODE_ENV === 'production') siteOrigin.protocol = 'https:';
const SITE_URL = siteOrigin.origin.replace(/\/$/, '');

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/analyze/'] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
