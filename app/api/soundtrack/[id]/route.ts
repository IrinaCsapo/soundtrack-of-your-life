import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const maxDuration = 10;

/**
 * PATCH /api/soundtrack/[id]
 *
 * Updates fields on a soundtrack record. Supports:
 *   - selectedTitle: string  → save the user's chosen title
 *   - isPublic: boolean      → opt in or out of the public archive
 *
 * Body example:
 *   { "selectedTitle": "honey at four" }
 *   { "isPublic": true }
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if (body && typeof body === 'object') {
    if ('selectedTitle' in body && typeof body.selectedTitle === 'string') {
      updates.selected_title = body.selectedTitle;
    }
    if ('isPublic' in body && typeof body.isPublic === 'boolean') {
      updates.is_public = body.isPublic;
      updates.shared_at = body.isPublic ? new Date().toISOString() : null;
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'no valid fields to update' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('soundtracks')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('[patch soundtrack] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, updated: updates });
}
