import { NextResponse } from 'next/server';
import { replicate, MUSIC_MODEL, MUSIC_INPUT_DEFAULTS } from '@/lib/replicate';
import { buildMusicPrompt } from '@/lib/musicPrompt';

// Vercel: allow up to 30s for the prediction-creation call. The actual
// generation happens on Replicate's side and is polled by the reveal page.
export const maxDuration = 30;

/**
 * POST /api/generate
 *
 * Takes the 5 answers, builds a music prompt, kicks off a Replicate prediction,
 * and returns the prediction ID (used as the soundtrack slug for now).
 *
 * The reveal page polls /api/soundtrack/[id]/status until the audio is ready.
 */
export async function POST(request: Request) {
  if (!process.env.REPLICATE_API_TOKEN) {
    return NextResponse.json(
      {
        error:
          'REPLICATE_API_TOKEN is not set. Add it to your .env.local file and restart `npm run dev`.',
      },
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

  const prompt = buildMusicPrompt(answers);
  console.log('[generate] prompt:', prompt);

  try {
    const prediction = await replicate.predictions.create({
      model: MUSIC_MODEL,
      input: {
        prompt,
        ...MUSIC_INPUT_DEFAULTS,
      },
    });

    console.log('[generate] prediction created:', prediction.id);

    return NextResponse.json({
      slug: prediction.id,
      prompt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    console.error('[generate] replicate error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
