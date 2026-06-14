import { questions } from './questions';

/**
 * Turn the user's 5 answers into a music generation prompt.
 *
 * For now: a template-based translation that wraps the user's own phrases
 * inside a strong genre/instrument/mood frame.
 *
 * Later: swap this for an LLM call (Claude Haiku) that produces a more
 * nuanced sonic vocabulary (instruments, tempo, texture) from the answers.
 */
export function buildMusicPrompt(answers: Record<string, string>): string {
  const userPhrases = questions
    .map((q) => answers[q.id]?.trim())
    .filter((a): a is string => Boolean(a))
    .join('; ');

  const parts = [
    'lofi ambient instrumental',
    'soft acoustic guitar, warm pad textures, gentle atmospheric noise',
    'slow tempo around 70 BPM',
    'contented, present, gentle nostalgia',
    userPhrases ? `evoking: ${userPhrases}` : null,
    'no vocals, no drums, mellow and breathing',
  ].filter(Boolean);

  return parts.join(', ');
}
