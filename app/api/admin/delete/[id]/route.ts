import { NextResponse } from 'next/server';
import {
  supabaseAdmin,
  AUDIO_BUCKET,
  COVERS_BUCKET,
} from '@/lib/supabase';

export const maxDuration = 15;

function checkPassword(request: Request): boolean {
  const password = request.headers.get('x-admin-password');
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return password === expected;
}

/**
 * DELETE /api/admin/delete/[id]
 * Header: x-admin-password: <secret>
 *
 * Hard-deletes a soundtrack:
 *   - removes the audio file from Supabase Storage
 *   - removes the cover file from Supabase Storage
 *   - removes the row from the soundtracks table
 *
 * Failures on file deletion are logged but don't block row deletion —
 * the row record is the source of truth for what shows up in the cabinet.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!checkPassword(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // 1. Try to remove the audio file (non-fatal if it fails)
  try {
    const { error: audioErr } = await supabaseAdmin.storage
      .from(AUDIO_BUCKET)
      .remove([`${id}.mp3`]);
    if (audioErr) console.warn('[admin/delete] audio remove warn:', audioErr);
  } catch (err) {
    console.warn('[admin/delete] audio remove error:', err);
  }

  // 2. Try to remove the cover file (non-fatal if it fails)
  try {
    const { error: coverErr } = await supabaseAdmin.storage
      .from(COVERS_BUCKET)
      .remove([`${id}.png`]);
    if (coverErr) console.warn('[admin/delete] cover remove warn:', coverErr);
  } catch (err) {
    console.warn('[admin/delete] cover remove error:', err);
  }

  // 3. Delete the row
  const { error: rowErr } = await supabaseAdmin
    .from('soundtracks')
    .delete()
    .eq('id', id);

  if (rowErr) {
    return NextResponse.json({ error: rowErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, deleted: id });
}
