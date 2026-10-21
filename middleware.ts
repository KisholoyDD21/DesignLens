import { NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const canonical = new URL(process.env.SITE_URL || 'https://designlens-p9yd.onrender.com');
if (process.env.NODE_ENV === 'production') canonical.protocol = 'https:';
const previewHosts = new Set(['localhost', '127.0.0.1', '::1']);

export async function middleware(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    const incomingHost = request.headers.get('host')?.split(':')[0]?.toLowerCase() || request.nextUrl.hostname.toLowerCase();
    if (!previewHosts.has(incomingHost)) {
      // Production reverse proxies must overwrite x-forwarded-proto before this middleware runs.
      const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase();
      const isHttps = forwardedProto === 'https' || (!forwardedProto && request.nextUrl.protocol === 'https:');
      const shouldCanonicalizeHost = incomingHost === `www.${canonical.hostname}` && incomingHost !== canonical.hostname;
      if (!isHttps || shouldCanonicalizeHost) {
        const target = new URL(`${request.nextUrl.pathname}${request.nextUrl.search}`, canonical.origin);
        return NextResponse.redirect(target, 301);
      }
    }
  }

  // Refresh Supabase session cookies & verify protected workspace routes
  const { response } = await updateSession(request);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|icon.svg|robots.txt|sitemap.xml).*)'],
};
