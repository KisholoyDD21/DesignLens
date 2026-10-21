import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient, getServerUser } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const saveReportSchema = z.object({
  id: z.string().uuid().optional(),
  url: z.string().min(1).max(2048),
  brandName: z.string().min(1).max(200),
  markdown: z.string().min(1).max(3_000_000),
  snapshot: z.record(z.string(), z.unknown()).default({}),
  isFavorite: z.boolean().optional().default(false),
  tags: z.array(z.string().max(50)).max(20).optional().default([]),
  notes: z.string().max(2000).optional(),
});

export async function GET(request: NextRequest) {
  const user = await getServerUser();
  if (!user) {
    return Response.json({ error: 'You must be signed in to access saved workspace reports.' }, { status: 401 });
  }

  try {
    const supabase = await createClient();
    const search = request.nextUrl.searchParams
      .get('search')
      ?.replace(/[^\p{L}\p{N}\s-]/gu, '')
      .trim()
      .slice(0, 100)
      .toLowerCase();
    const favoriteOnly = request.nextUrl.searchParams.get('favorite') === 'true';

    let query = supabase
      .from('reports')
      .select('id, url, brand_name, is_favorite, tags, notes, created_at, updated_at, snapshot')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (favoriteOnly) {
      query = query.eq('is_favorite', true);
    }

    if (search) {
      query = query.or(`brand_name.ilike.%${search}%,url.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) {
      return Response.json({ error: 'Failed to load saved reports from the database.' }, { status: 500 });
    }

    const reports = (data ?? []).map((report) => {
      const snapshot = { ...report.snapshot };
      delete snapshot.screenshotDataUrl;
      return { ...report, snapshot };
    });

    return Response.json({ reports });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Database error occurred.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const user = await getServerUser();
  if (!user) {
    return Response.json({ error: 'You must be signed in to save reports to your workspace.' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const parsed = saveReportSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'Invalid report data payload.', details: parsed.error.format() }, { status: 400 });
  }

  const { id, url, brandName, markdown, snapshot, isFavorite, tags, notes } = parsed.data;

  try {
    const supabase = await createClient();

    // Upsert into reports table ensuring user_id matches authenticated session
    const record = {
      ...(id ? { id } : {}),
      user_id: user.id,
      url,
      brand_name: brandName,
      markdown,
      snapshot,
      is_favorite: isFavorite,
      tags,
      notes: notes || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('reports')
      .upsert(record)
      .select('id, url, brand_name, is_favorite, tags, notes, created_at, updated_at')
      .single();

    if (error) {
      return Response.json({ error: `Failed to save report: ${error.message}` }, { status: 500 });
    }

    return Response.json({ success: true, report: data });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Database error occurred.' },
      { status: 500 }
    );
  }
}
