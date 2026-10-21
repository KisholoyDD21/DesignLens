import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSafeRedirectUrl } from '@/lib/auth-validation';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const type = requestUrl.searchParams.get('type');
  const next = requestUrl.searchParams.get('next');
  const rawTarget = type === 'recovery' ? '/reset-password' : (next || '/dashboard');
  const safeTarget = getSafeRedirectUrl(rawTarget, '/dashboard');

  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        const errorUrl = new URL('/login', requestUrl.origin);
        errorUrl.searchParams.set('error', 'The authentication link has expired or is invalid. Please try again.');
        return NextResponse.redirect(errorUrl);
      }
      return NextResponse.redirect(new URL(safeTarget, requestUrl.origin));
    } catch {
      const errorUrl = new URL('/login', requestUrl.origin);
      errorUrl.searchParams.set('error', 'Authentication service unavailable. Please check your connection.');
      return NextResponse.redirect(errorUrl);
    }
  }

  // If no code was provided (e.g. direct visit)
  return NextResponse.redirect(new URL('/login', requestUrl.origin));
}
