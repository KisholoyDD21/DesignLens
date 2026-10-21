/**
 * Supabase client environment configuration & validation.
 * Ensures clear developer-facing errors when keys are missing.
 */

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function getSupabaseConfig(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Missing Supabase configuration. Please provide NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment (.env).'
    );
  }

  // Validate format
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL must be a valid HTTP/HTTPS URL.');
    }
  } catch (err) {
    throw new Error(
      `Invalid NEXT_PUBLIC_SUPABASE_URL: ${err instanceof Error ? err.message : 'Invalid URL'}`
    );
  }

  return { url, anonKey };
}
