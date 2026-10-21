import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { getSafeRedirectUrl } from '@/lib/auth-validation';

const PROTECTED_PREFIXES = ['/dashboard', '/settings'];
const AUTH_ONLY_PREFIXES = ['/login', '/signup', '/forgot-password'];

export async function updateSession(request: NextRequest): Promise<{
  response: NextResponse;
  user: User | null;
}> {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // If Supabase is not configured, continue without auth for public parts
    const isProtected = PROTECTED_PREFIXES.some(p => request.nextUrl.pathname.startsWith(p));
    if (isProtected) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('error', 'Authentication is not yet configured on this instance.');
      return {
        response: NextResponse.redirect(loginUrl),
        user: null,
      };
    }
    return { response: supabaseResponse, user: null };
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // IMPORTANT: DO NOT use getSession() inside middleware/server; use getUser()
  const { data: { user } } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`));
  const isAuthOnly = AUTH_ONLY_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`));

  if (isProtected && !user) {
    const redirectUrl = new URL('/login', request.url);
    // Open-redirect safe: only store the pathname and search
    redirectUrl.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return {
      response: NextResponse.redirect(redirectUrl),
      user: null,
    };
  }

  if (isAuthOnly && user) {
    // If user is already authenticated, redirect to dashboard or requested next page
    const next = request.nextUrl.searchParams.get('next');
    const destination = getSafeRedirectUrl(next, '/dashboard');
    return {
      response: NextResponse.redirect(new URL(destination, request.url)),
      user,
    };
  }

  return { response: supabaseResponse, user };
}
