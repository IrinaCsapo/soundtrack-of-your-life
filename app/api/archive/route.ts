import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const revalidate = 30;

/**
 * GET /api/archive
 *
 * Returns the most recent public soundtracks (those the user opted to share).
 * Filters to only those with both music + cover persisted in Supabase Storage.
 * Anonymous — no user identity, ever.
 */
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('soundtracks')
    .select(
      'id, selected_title, titles, cover_url, music_url, answers, shared_at'
    )
    .eq('is_public', true)
    .not('music_url', 'is', null)
    .order('shared_at', { ascending: false })
    .limit(48);

  if (error) {
    console.error('[archive] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const soundtracks = (data ?? []).map((s) => ({
    id: s.id,
    title:
      s.selected_title ||
      (Array.isArray(s.titles) && s.titles.length > 0 ? s.titles[0] : 'untitled'),
    coverUrl: s.cover_url,
    musicUrl: s.music_url,
    poemLines:
      s.answers && typeof s.answers === 'object'
        ? Object.entries(s.answers as Record<string, string>)
            .filter(([key, value]) => value && key !== 'q4')
            .map(([, value]) => value)
        : [],
    sharedAt: s.shared_at,
  }));

  return NextResponse.json({ soundtracks });
}
