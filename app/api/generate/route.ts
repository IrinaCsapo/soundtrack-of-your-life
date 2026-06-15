import { NextResponse } from 'next/server';
import {
  replicate,
  MUSIC_INPUT_DEFAULTS,
  COVER_INPUT_DEFAULTS,
  getLatestMusicVersion,
  getLatestCoverVersion,
} from '@/lib/replicate';
import { generateSoundtrackMetadata } from '@/lib/claude';
import { supabaseAdmin } from '@/lib/supabase';

// Vercel: allow up to 30s for prediction creation. Actual generation runs on
// Replicate's side and is polled by the reveal page.
export const maxDuration = 30;

/**
 * POST /api/generate
 *
 * Pipeline:
 *  1. Claude produces musicPrompt + visualPrompt + 3 titles in one call
 *  2. Fire MusicGen (music) and Flux Dev (cover) predictions in parallel
 *  3. Insert soundtrack row in Supabase
 *  4. Return slug + titles
 *
 * The reveal page polls /api/soundtrack/[id]/status. When a prediction
 * succeeds, the status endpoint downloads the asset from Replicate and
 * persists to Supabase Storage in the background.
 */
export async function POST(request: Request) {
  if (!process.env.REPLICATE_API_TOKEN) {
    return NextResponse.json(
      { error: 'REPLICATE_API_TOKEN is not set.' },
      { status: 500 }
    );
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY is not set.' },
      { status: 500 }
    );
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
    return NextResponse.json(
      { error: 'Supabase env vars are not set.' },
      { status: 500 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const answers =
    body && typeof body === 'object' && 'answers' in body
      ? (body as { answers: Record<string, string> }).answers
      : null;

  if (!answers || Object.keys(answers).length === 0) {
    return NextResponse.json({ error: 'missing answers' }, { status: 400 });
  }

  try {
    // 1. Claude — music prompt + visual prompt + titles in one call
    const { musicPrompt, visualPrompt, titles } =
      await generateSoundtrackMetadata(answers);
    console.log('[generate] music prompt:', musicPrompt);
    console.log('[generate] visual prompt:', visualPrompt);
    console.log('[generate] titles:', titles);

    // 2. Get latest model versions in parallel
    const [musicVersion, coverVersion] = await Promise.all([
      getLatestMusicVersion(),
      getLatestCoverVersion(),
    ]);

    // 3. Fire both Replicate predictions in parallel
    const [musicPrediction, coverPrediction] = await Promise.all([
      replicate.predictions.create({
        version: musicVersion,
        input: { prompt: musicPrompt, ...MUSIC_INPUT_DEFAULTS },
      }),
      replicate.predictions.create({
        version: coverVersion,
        input: { prompt: visualPrompt, ...COVER_INPUT_DEFAULTS },
      }),
    ]);

    console.log('[generate] music prediction:', musicPrediction.id);
    console.log('[generate] cover prediction:', coverPrediction.id);

    // 4. Persist soundtrack record (music prediction ID is the slug).
    //    Default to public — soundtracks join the Cabinet automatically.
    //    We never collect identifying info, so this is safe by design.
    const now = new Date().toISOString();
    const { error: insertError } = await supabaseAdmin
      .from('soundtracks')
      .insert({
        id: musicPrediction.id,
        answers,
        music_prompt: musicPrompt,
        visual_prompt: visualPrompt,
        titles,
        music_replicate_id: musicPrediction.id,
        cover_replicate_id: coverPrediction.id,
        music_status: 'starting',
        cover_status: 'starting',
        is_public: true,
        shared_at: now,
      });

    if (insertError) {
      console.error('[generate] supabase insert error:', insertError);
      return NextResponse.json(
        { error: 'failed to persist soundtrack: ' + insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      slug: musicPrediction.id,
      titles,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    console.error('[generate] error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
