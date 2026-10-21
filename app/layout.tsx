import type { Metadata, Viewport } from 'next';
import CookieConsent from '@/components/cookie-consent';
import './globals.css';

const siteOrigin = new URL(process.env.SITE_URL || 'https://designlens.app');
if (process.env.NODE_ENV === 'production') siteOrigin.protocol = 'https:';
const siteUrl = siteOrigin.origin.replace(/\/$/, '');

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: 'DesignLens — See the system behind the site', template: '%s · DesignLens' },
  description: 'Turn public websites into evidence-backed design systems. Extract color, type, spacing, components, motion, and tokens into a downloadable design.md.',
  applicationName: 'DesignLens',
  keywords: ['design system', 'website analysis', 'design tokens', 'color palette', 'typography', 'design.md'],
  alternates: { canonical: '/' },
  openGraph: {
    title: 'DesignLens — Turn any website into a design system',
    description: 'Colors, typography, spacing, components, motion, and tokens — documented.',
    url: siteUrl,
    siteName: 'DesignLens',
    type: 'website',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'DesignLens — turn any website into a design system' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DesignLens — Turn any website into a design system',
    description: 'Colors, typography, spacing, components, motion, and tokens — documented.',
    images: ['/opengraph-image'],
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 } },
};
export const viewport: Viewport = { themeColor: '#0A0A0F', width: 'device-width', initialScale: 1, maximumScale: 5 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" data-theme="dark" suppressHydrationWarning><head><link rel="preconnect" href="https://fonts.googleapis.com"/><link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/></head><body>{children}<CookieConsent /></body></html>;
}
