'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseConfig, isSupabaseConfigured } from './config';

let client: SupabaseClient | null = null;

export function createClient(): SupabaseClient {
  if (client) return client;

  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your environment.'
    );
  }

  const { url, anonKey } = getSupabaseConfig();
  client = createBrowserClient(url, anonKey);
  return client;
}

export function getBrowserClientSafe(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  return createClient();
}
