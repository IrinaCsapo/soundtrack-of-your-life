import { NextResponse } from 'next/server';
import {
  replicate,
  MUSIC_INPUT_DEFAULTS,
  getLatestMusicVersion,
} from '@/lib/replicate';
import { generateSoundtrackMetadata } from '@/lib/claude';

// Vercel: allow up to 30s for the prediction-creation call. The actual
// music generation happens on Replicate's side and is polled by the reveal page.
export const maxDuration = 30;

/**
 * POST /api/generate
 *
 * 1. Takes the 6 answers (5 memory + 1 genre).
 * 2. Calls Claude to produce a music prompt + three candidate titles.
 * 3. Looks up the latest version of MusicGen on Replicate.
 * 4. Kicks off a Replicate prediction with the music prompt.
 * 5. Returns the prediction ID + titles to the client.
 *
 * The reveal page polls /api/soundtrack/[id]/status until the audio is ready,
 * and uses /api/titles to shuffle for fresh titles when asked.
 */
export async function POST(request: Request) {
  if (!process.env.REPLICATE_API_TOKEN) {
    return NextResponse.json(
      { error: 'REPLICATE_API_TOKEN is not set in Vercel env vars.' },
      { status: 500 }
    );
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY is not set in Vercel env vars.' },
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
    // 1. Claude → music prompt + three candidate titles
    const { musicPrompt, titles } = await generateSoundtrackMetadata(answers);
    console.log('[generate] prompt:', musicPrompt);
    console.log('[generate] titles:', titles);

    // 2. Replicate → start music generation
    const versionId = await getLatestMusicVersion();
    const prediction = await replicate.predictions.create({
      version: versionId,
      input: {
        prompt: musicPrompt,
        ...MUSIC_INPUT_DEFAULTS,
      },
    });

    console.log('[generate] prediction created:', prediction.id);

    return NextResponse.json({
      slug: prediction.id,
      prompt: musicPrompt,
      titles,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    console.error('[generate] error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
