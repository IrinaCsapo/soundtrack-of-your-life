import Anthropic from '@anthropic-ai/sdk';

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/** Claude Haiku — cheap, fast, sufficient for poem + prompt work. */
export const CLAUDE_MODEL = 'claude-haiku-4-5-20251001';

const TITLE_VOICE_EXAMPLES = `
Examples of titles in the voice we want (lowercase, 1–4 words, soft, evocative, not clever):
  "honey at four"
  "the kettle, far off"
  "you didn't know yet"
  "almost-morning"
  "the year of the wind"
  "what the rain said"
  "blue, slowly"
  "before anyone called"
`;

const METADATA_SYSTEM_PROMPT = `You translate a user's memory into two things:
1. A music generation prompt to send to MusicGen (Meta's text-to-music model). It should describe the music — genre, instruments, mood, tempo, texture — in a way that sounds like the memory feels. Avoid abstract poetry; MusicGen responds to concrete sonic vocabulary.
2. Three poetic candidate titles for the resulting soundtrack — distinct from each other in mood or angle.

${TITLE_VOICE_EXAMPLES}

If the user specifies a genre, weave it into the music prompt as the central frame. If they don't, default to lo-fi ambient instrumental.

Always return valid JSON, no markdown fences, with exactly this shape:
{
  "musicPrompt": "...",
  "titles": ["...", "...", "..."]
}`;

const TITLES_SYSTEM_PROMPT = `You generate three poetic candidate titles for a soundtrack inspired by a user's memory. Lowercase, 1–4 words each, evocative, distinct from each other.

${TITLE_VOICE_EXAMPLES}

Return ONLY a JSON array of exactly three strings, no markdown fences, no prose:
["title one", "title two", "title three"]`;

export type Answers = Record<string, string>;

export type SoundtrackMetadata = {
  musicPrompt: string;
  titles: string[];
};

function formatUserPrompt(answers: Answers): string {
  return [
    'The user answered these questions about a memory:',
    `Q1 — where they are: ${answers.q1 || '(skipped)'}`,
    `Q2 — time / light: ${answers.q2 || '(skipped)'}`,
    `Q3 — a sensory detail: ${answers.q3 || '(skipped)'}`,
    `Q4 — if it had weather: ${answers.q4 || '(skipped)'}`,
    `Q5 — what it whispers: ${answers.q5 || '(skipped)'}`,
    answers.q6
      ? `Genre they want: ${answers.q6}`
      : 'Genre: not specified (use lo-fi ambient default)',
  ].join('\n');
}

function extractFirstJSON<T = unknown>(text: string): T {
  const trimmed = text.trim();

  // Try a fenced code block first
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenced) {
    return JSON.parse(fenced[1]) as T;
  }

  // Otherwise the first {...} or [...]
  const firstBracket = trimmed.search(/[{[]/);
  if (firstBracket === -1) {
    throw new Error('No JSON found in Claude response');
  }
  return JSON.parse(trimmed.slice(firstBracket)) as T;
}

/**
 * One Claude call: returns the music prompt and three candidate titles.
 * Called from /api/generate when the user submits the question flow.
 */
export async function generateSoundtrackMetadata(
  answers: Answers
): Promise<SoundtrackMetadata> {
  const message = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 800,
    temperature: 0.9,
    system: METADATA_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: formatUserPrompt(answers) }],
  });

  const textBlock = message.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text content in Claude response');
  }

  const parsed = extractFirstJSON<SoundtrackMetadata>(textBlock.text);

  if (
    typeof parsed.musicPrompt !== 'string' ||
    !Array.isArray(parsed.titles) ||
    parsed.titles.length === 0
  ) {
    throw new Error('Unexpected response shape from Claude');
  }

  return {
    musicPrompt: parsed.musicPrompt,
    titles: parsed.titles.slice(0, 3),
  };
}

/**
 * Generate three fresh candidate titles for a memory — used by the
 * "shuffle" button on the reveal page. Skips the music prompt to save tokens.
 */
export async function generateTitles(answers: Answers): Promise<string[]> {
  const message = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 200,
    temperature: 1.0, // higher temp = more variety on shuffle
    system: TITLES_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content:
          formatUserPrompt(answers) +
          '\n\nGenerate THREE NEW candidate titles, distinct from any default set.',
      },
    ],
  });

  const textBlock = message.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text content in Claude response');
  }

  const parsed = extractFirstJSON<string[]>(textBlock.text);

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('Unexpected titles response from Claude');
  }

  return parsed.slice(0, 3).filter((t) => typeof t === 'string');
}
