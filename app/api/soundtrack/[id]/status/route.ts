import { NextResponse } from 'next/server';
import { replicate } from '@/lib/replicate';

export const maxDuration = 10;

/**
 * GET /api/soundtrack/[id]/status
 *
 * Returns the current state of a Replicate prediction.
 * Called repeatedly by the reveal page while the music is being generated.
 */
export async function GET(
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

  try {
    const prediction = await replicate.predictions.get(id);

    const audioUrl = Array.isArray(prediction.output)
      ? prediction.output[0]
      : typeof prediction.output === 'string'
        ? prediction.output
        : null;

    return NextResponse.json({
      status: prediction.status,
      audioUrl,
      error: prediction.error ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    console.error('[status] replicate error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
