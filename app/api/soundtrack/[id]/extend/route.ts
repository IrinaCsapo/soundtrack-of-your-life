import { NextResponse } from 'next/server';
import {
  replicate,
  MUSIC_INPUT_DEFAULTS,
  getLatestMusicVersion,
} from '@/lib/replicate';
import { supabaseAdmin } from '@/lib/supabase';

export const maxDuration = 30;

const MAX_DURATION_SECONDS = 120;
const EXTENSION_INCREMENT = 30;

/**
 * POST /api/soundtrack/[id]/extend
 *
 * "Keep it going" — fires a MusicGen continuation prediction to extend the
 * soundtrack by 30 seconds. Uses the last URL in `music_urls` as the input
 * audio so each extension continues from wherever the last one left off,
 * preserving the musical thread the user already fell in love with.
 *
 * Caps total playback at 120 seconds (3 extensions from a 30s original).
 * Rejects duplicate requests while an extension is already in flight.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!process.env.REPLICATE_API_TOKEN) {
    return NextResponse.json(
      { error: 'REPLICATE_API_TOKEN is not set' },
      { status: 500 }
    );
  }

  // Load the current soundtrack — we need the music prompt (to keep the
  // continuation on the same aesthetic thread), the last URL (as continuation
  // seed), and the current duration (to check the cap).
  const { data: record, error: readError } = await supabaseAdmin
    .from('soundtracks')
    .select('*')
    .eq('id', id)
    .single();

  if (readError || !record) {
    return NextResponse.json(
      { error: 'soundtrack not found' },
      { status: 404 }
    );
  }

  // Cap check — no extensions past 120s.
  if (record.music_duration >= MAX_DURATION_SECONDS) {
    return NextResponse.json(
      { error: 'already at full length' },
      { status: 400 }
    );
  }

  // Prevent duplicate extensions from racing when the user double-taps or
  // when a poll comes back stale.
  if (
    record.extension_status === 'starting' ||
    record.extension_status === 'processing'
  ) {
    return NextResponse.json(
      { error: 'extension already in progress' },
      { status: 409 }
    );
  }

  // Continuation seed = the last URL we have in the playback list, so each
  // click extends from where the previous segment left off rather than
  // always continuing the original 30s.
  const musicUrls: string[] =
    Array.isArray(record.music_urls) && record.music_urls.length > 0
      ? record.music_urls
      : record.music_url
        ? [record.music_url]
        : [];

  const seedUrl = musicUrls[musicUrls.length - 1];
  if (!seedUrl) {
    return NextResponse.json(
      { error: 'no source audio to extend from' },
      { status: 400 }
    );
  }

  if (!record.music_prompt) {
    return NextResponse.json(
      { error: 'missing original music prompt' },
      { status: 400 }
    );
  }

  // Fire the continuation prediction. `continuation: true` tells MusicGen
  // to use input_audio as the starting context; continuation_start/end
  // define which slice of the input to condition on (we use the whole
  // 30-second seed). Duration is the amount of NEW audio to generate.
  const musicVersion = await getLatestMusicVersion();
  const prediction = await replicate.predictions.create({
    version: musicVersion,
    input: {
      ...MUSIC_INPUT_DEFAULTS,
      prompt: record.music_prompt,
      input_audio: seedUrl,
      continuation: true,
      continuation_start: 0,
      continuation_end: EXTENSION_INCREMENT,
      duration: EXTENSION_INCREMENT,
    },
  });

  console.log('[extend] fired prediction:', prediction.id);

  const { error: updateError } = await supabaseAdmin
    .from('soundtracks')
    .update({
      extension_replicate_id: prediction.id,
      extension_status: 'starting',
    })
    .eq('id', id);

  if (updateError) {
    console.error('[extend] failed to persist extension state:', updateError);
    return NextResponse.json(
      { error: 'failed to persist extension state' },
      { status: 500 }
    );
  }

  return NextResponse.json({ extensionId: prediction.id });
}
