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
 * POST /api/admin/list
 * Header: x-admin-password: <secret>
 *
 * Returns every soundtrack in the cabinet (public + private), newest first.
 */
export async function POST(request: Request) {
  if (!process.env.ADMIN_PASSWORD) {
    return NextResponse.json(
      { error: 'ADMIN_PASSWORD env var is not set on the server.' },
      { status: 500 }
    );
  }

  if (!checkPassword(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from('soundtracks')
    .select(
      'id, selected_title, titles, cover_url, music_url, answers, is_public, created_at'
    )
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const items = (data ?? []).map((s) => {
    const answers = (s.answers ?? {}) as Record<string, string>;
    return {
      id: s.id,
      title:
        s.selected_title ||
        (Array.isArray(s.titles) && s.titles.length > 0
          ? s.titles[0]
          : 'untitled'),
      coverUrl: s.cover_url,
      musicUrl: s.music_url,
      genre: answers.q4 || null,
      isPublic: s.is_public,
      createdAt: s.created_at,
      // Show the first answer as context so Irina can recognize the entry
      preview: answers.q1 || answers.q2 || '',
    };
  });

  return NextResponse.json({ soundtracks: items });
}
