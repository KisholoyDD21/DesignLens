import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient, getServerUser } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const updateProfileSchema = z.object({
  displayName: z.string().trim().min(1, 'Display name cannot be empty.').max(80).optional(),
  themePreference: z.enum(['dark', 'light', 'system']).optional(),
});

export async function GET() {
  const user = await getServerUser();
  if (!user) {
    return Response.json({ error: 'Authentication required.' }, { status: 401 });
  }

  try {
    const supabase = await createClient();
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, email, display_name, avatar_url, theme_preference, created_at, updated_at')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      return Response.json({ error: 'Failed to load profile.' }, { status: 500 });
    }

    return Response.json({
      user: {
        id: user.id,
        email: user.email,
        emailConfirmedAt: user.email_confirmed_at,
        appMetadata: user.app_metadata,
        userMetadata: user.user_metadata,
        providers: user.app_metadata.providers || [user.app_metadata.provider],
        createdAt: user.created_at,
      },
      profile: profile || {
        id: user.id,
        email: user.email || '',
        display_name: user.user_metadata.full_name || user.user_metadata.name || user.email?.split('@')[0] || 'User',
        theme_preference: 'dark',
      },
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Database error.' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const user = await getServerUser();
  if (!user) {
    return Response.json({ error: 'Authentication required.' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'Invalid update payload.' }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const updates: Record<string, unknown> = {};
    if (parsed.data.displayName !== undefined) {
      updates.display_name = parsed.data.displayName;
    }
    if (parsed.data.themePreference !== undefined) {
      updates.theme_preference = parsed.data.themePreference;
    }
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, email: user.email || '', ...updates })
      .select()
      .single();

    if (error) {
      return Response.json({ error: 'Failed to update profile.' }, { status: 500 });
    }

    // Also update Supabase auth metadata if displayName changed
    if (parsed.data.displayName) {
      const { error: metadataError } = await supabase.auth.updateUser({
        data: { full_name: parsed.data.displayName },
      });
      if (metadataError) {
        return Response.json(
          { error: 'Profile settings were saved, but the display name could not be synchronized with your account.' },
          { status: 502 }
        );
      }
    }

    return Response.json({ success: true, profile: data });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Database error.' },
      { status: 500 }
    );
  }
}
