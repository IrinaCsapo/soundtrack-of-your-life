import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const maxDuration = 10;

function checkPassword(request: Request): boolean {
  const password = request.headers.get('x-admin-password');
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return password === expected;
}

/**
 * POST /api/admin/hide/[id]
 * Header: x-admin-password: <secret>
 * Body: { isPublic: boolean }
 *
 * Toggles whether a soundtrack appears in the public archive. Doesn't delete
 * data — soundtrack still exists at its URL, just removed from the cabinet
 * gallery. Useful when you want to hide something without losing it.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!checkPassword(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    isPublic?: boolean;
  };

  if (typeof body.isPublic !== 'boolean') {
    return NextResponse.json(
      { error: 'missing isPublic boolean' },
      { status: 400 }
    );
  }

  const { error } = await supabaseAdmin
    .from('soundtracks')
    .update({
      is_public: body.isPublic,
      shared_at: body.isPublic ? new Date().toISOString() : null,
    })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, isPublic: body.isPublic });
}
