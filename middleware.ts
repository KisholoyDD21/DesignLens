import { NextRequest, NextResponse } from 'next/server';

const canonical = new URL(process.env.SITE_URL || 'https://designlens.app');
if (process.env.NODE_ENV === 'production') canonical.protocol = 'https:';
const previewHosts = new Set(['localhost', '127.0.0.1', '::1']);

export function middleware(request: NextRequest) {
  if (process.env.NODE_ENV !== 'production') return NextResponse.next();
  const incomingHost = request.headers.get('host')?.split(':')[0]?.toLowerCase() || request.nextUrl.hostname.toLowerCase();
  if (previewHosts.has(incomingHost)) return NextResponse.next();

  // Production reverse proxies must overwrite x-forwarded-proto before this middleware runs.
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase();
  const isHttps = forwardedProto === 'https' || (!forwardedProto && request.nextUrl.protocol === 'https:');
  const shouldCanonicalizeHost = incomingHost === `www.${canonical.hostname}` && incomingHost !== canonical.hostname;
  if (!isHttps || shouldCanonicalizeHost) {
    const target = new URL(`${request.nextUrl.pathname}${request.nextUrl.search}`, canonical.origin);
    return NextResponse.redirect(target, 301);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
