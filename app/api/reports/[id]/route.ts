import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient, getServerUser } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const updateSchema = z.object({
  brandName: z.string().min(1).max(200).optional(),
  isFavorite: z.boolean().optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  notes: z.string().max(2000).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id || id.length > 64) {
    return Response.json({ error: 'Valid report id is required.' }, { status: 400 });
  }

  const user = await getServerUser();
  if (!user) {
    return Response.json({ error: 'Authentication required.' }, { status: 401 });
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      return Response.json({ error: 'Failed to retrieve report.' }, { status: 500 });
    }

    if (!data) {
      // Do not disclose whether the report exists under another user
      return Response.json({ error: 'Report not found in your workspace.' }, { status: 404 });
    }

    return Response.json({ report: data });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Database error occurred.' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'Invalid update payload.' }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const updates: Record<string, unknown> = {};
    if (parsed.data.brandName !== undefined) updates.brand_name = parsed.data.brandName;
    if (parsed.data.isFavorite !== undefined) updates.is_favorite = parsed.data.isFavorite;
    if (parsed.data.tags !== undefined) updates.tags = parsed.data.tags;
    if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('reports')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id, url, brand_name, is_favorite, tags, notes, updated_at')
      .maybeSingle();

    if (error) {
      return Response.json({ error: 'Failed to update report.' }, { status: 500 });
    }

    if (!data) {
      return Response.json({ error: 'Report not found or unauthorized.' }, { status: 404 });
    }

    return Response.json({ success: true, report: data });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Database error.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getServerUser();
  if (!user) {
    return Response.json({ error: 'Authentication required.' }, { status: 401 });
  }

  try {
    const supabase = await createClient();
    const { error, count } = await supabase
      .from('reports')
      .delete({ count: 'exact' })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      return Response.json({ error: 'Failed to delete report.' }, { status: 500 });
    }

    if (count === 0) {
      return Response.json({ error: 'Report not found or already deleted.' }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Database error.' },
      { status: 500 }
    );
  }
}
