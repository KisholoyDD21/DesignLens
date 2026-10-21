import { NextRequest } from 'next/server';
import { createClient, getServerUser } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
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

  const confirmation = (body as { confirmation?: string })?.confirmation;
  if (confirmation !== 'DELETE') {
    return Response.json({ error: 'Please type DELETE in capital letters to confirm account deletion.' }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const { error: rpcError } = await supabase.rpc('delete_user_account');
    if (rpcError) {
      console.error('Account deletion failed:', rpcError.message);
      return Response.json({ error: 'Could not delete the account. Please try again.' }, { status: 500 });
    }

    const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
    if (signOutError) {
      console.error('Account was deleted, but the local session could not be cleared:', signOutError.message);
      return Response.json(
        { error: 'Your account was deleted, but this session could not be cleared. Close this browser session.' },
        { status: 500 }
      );
    }

    return Response.json({ success: true, message: 'Your account and all associated design reports have been permanently deleted.' });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Failed to delete account.' },
      { status: 500 }
    );
  }
}
