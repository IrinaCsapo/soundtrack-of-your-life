import { NextResponse } from 'next/server';
import { generateTitles } from '@/lib/claude';

export const maxDuration = 10;

/**
 * POST /api/titles
 *
 * Body: { answers: Record<string, string> }
 * Returns: { titles: string[3] }
 *
 * Called by the reveal page's "shuffle" button to fetch three NEW
 * candidate titles for the same memory.
 */
export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY is not set' },
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
    const titles = await generateTitles(answers);
    return NextResponse.json({ titles });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    console.error('[titles] error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
