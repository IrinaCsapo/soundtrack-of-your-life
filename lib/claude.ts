import Anthropic from '@anthropic-ai/sdk';

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/** Claude Haiku — cheap, fast, sufficient for prompt + poem work. */
export const CLAUDE_MODEL = 'claude-haiku-4-5-20251001';

const TITLE_VOICE_EXAMPLES = `
Examples of titles in the voice we want (lowercase, 1–4 words, soft, evocative):
  "honey at four"
  "the kettle, far off"
  "you didn't know yet"
  "almost-morning"
  "the year of the wind"
  "what the rain said"
  "blue, slowly"
  "before anyone called"
`;

const METADATA_SYSTEM_PROMPT = `You translate a user's memory into THREE things:

1. A MUSIC generation prompt for MusicGen (Meta's text-to-music model).

The music should always be PALATABLE, SOOTHING, MELANCHOLIC lo-fi ambient — gentle, accessible, comforting, easy to listen to in the background. Think: chillhop beats, slow lo-fi piano, warm acoustic guitar, soft electric piano, mellow synth pads, vinyl crackle, dreampop without distortion, gentle nostalgia, the inside of a coffee shop on a rainy afternoon, the warm wash of a candlelit room at dusk.

Describe: GENRE (always anchored in palatable lo-fi / ambient / chillhop / soft dreampop), INSTRUMENTS (warm acoustic guitar, soft electric piano, mellow synth pads, brushed kit or no drums, gentle bass), MOOD (melancholic, hopeful, contemplative, tender, soft, never angry or chaotic), TEMPO (slow — around 60–80 BPM), TEXTURE (warm, fuzzy, intimate, slightly nostalgic, never harsh or jarring or abrasive).

If the user specifies a genre in q4, weave it in but always interpret it through a PALATABLE filter — "shoegaze" becomes gentle dreampop (not a wall of noise), "jazz" becomes quiet late-night piano jazz (not free jazz), "psychedelic" becomes warm hazy synths (not chaotic), "drone" becomes soft ambient drone (not harsh).

STRICTLY AVOID: experimental, harsh, glitchy, dissonant, abrasive, avant-garde, noisy, atonal, broken, chaotic. The music should be a soft comforting hug, not a challenging listening experience.

IMPORTANT: the VISUAL prompt direction below (which references Brian Eno, Boards of Canada, Burial, Aphex Twin, etc.) is for ALBUM COVER IMAGES ONLY — do NOT apply that experimental aesthetic to the music. The music stays palatable, soothing, melancholic lo-fi ambient regardless of what visual references appear later in this prompt.

2. A VISUAL generation prompt for Flux (text-to-image model) for the soundtrack's square (1:1) album cover.

CRITICAL DIRECTION: This is an ABSTRACT, DREAMLIKE, EXPERIMENTAL piece of album art. Not a depiction. Not a scene. Not photography. A visual interpretation of the FEELING of the memory, never the literal contents of it.

Reference aesthetics: Brian Eno's Music for Airports, Cocteau Twins / 4AD record sleeves, Boards of Canada album art, William Basinski's Disintegration Loops, Burial covers, Aphex Twin record art. Atmospheric, swirling, painterly, mysterious, slightly broken or decayed.

Vocabulary to draw from (combine freely): abstract oil painting, swirling color fields, soft melting forms, light leaks, smoke, ink wash, photogram, mixed media collage, polaroid disintegration, oil-on-water, holographic shimmer, glitched film scan, scratched emulsion, frozen mist, layered transparencies, watercolor bleeds, double exposure, dreamlike textures, expressionist brush strokes, melting wax, broken mirrors.

Be specific about: MEDIUM (oil painting / ink wash / glitched film scan / mixed-media collage / pinhole photography / cyanotype / etc.), COLOR PALETTE (the emotional weather of the memory — be specific with named colours), and TEXTURE QUALITY (smooth / grainy / swirling / melting / fractured / liquid).

STRICTLY AVOID: any literal scene depiction, human figures, faces, recognizable rooms, kitchens, windows, kettles, beds, bedrooms, sunlight streaming through windows, photoreal portraits, photoreal landscapes, generic stock photography aesthetics, cute illustration, vector art, geometric perfection, anything that looks like a film still or movie poster.

Should feel like: a memory that's started to dissolve, the inside of a dream, the texture of music itself, a feeling you can't quite name. Closer to a painting hanging in a contemporary art gallery than a photograph from anyone's life.

3. Three poetic CANDIDATE TITLES for the soundtrack — distinct from each other in mood or angle. THE FIRST TITLE SHOULD BE THE WEIRDEST AND MOST POETIC of the three — a phrase that surprises, that doesn't immediately reveal what it's about, that could be a line in an experimental poetry book. The first title is the one we'll save by default.

${TITLE_VOICE_EXAMPLES}

Always return valid JSON, no markdown fences, with exactly this shape:
{
  "musicPrompt": "...",
  "visualPrompt": "...",
  "titles": ["...", "...", "..."]
}`;

const TITLES_SYSTEM_PROMPT = `You generate three poetic candidate titles for a soundtrack inspired by a user's memory. Lowercase, 1–4 words each, evocative, distinct from each other.

${TITLE_VOICE_EXAMPLES}

Return ONLY a JSON array of exactly three strings, no markdown fences, no prose:
["title one", "title two", "title three"]`;

export type Answers = Record<string, string>;

export type SoundtrackMetadata = {
  musicPrompt: string;
  visualPrompt: string;
  titles: string[];
};

function formatUserPrompt(answers: Answers): string {
  return [
    'The user answered these questions about a memory:',
    `Q1 — where and when: ${answers.q1 || '(skipped)'}`,
    `Q2 — what they hear, touch, or notice: ${answers.q2 || '(skipped)'}`,
    `Q3 — what the moment whispers: ${answers.q3 || '(skipped)'}`,
    answers.q4
      ? `Genre they want: ${answers.q4}`
      : 'Genre: not specified (use lo-fi ambient default)',
  ].join('\n');
}

function extractFirstJSON<T = unknown>(text: string): T {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenced) return JSON.parse(fenced[1]) as T;
  const firstBracket = trimmed.search(/[{[]/);
  if (firstBracket === -1) throw new Error('No JSON found in Claude response');
  return JSON.parse(trimmed.slice(firstBracket)) as T;
}

/**
 * One Claude call: returns the music prompt, the visual prompt, and three
 * candidate titles. Called from /api/generate.
 */
export async function generateSoundtrackMetadata(
  answers: Answers
): Promise<SoundtrackMetadata> {
  const message = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1000,
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
    typeof parsed.visualPrompt !== 'string' ||
    !Array.isArray(parsed.titles) ||
    parsed.titles.length === 0
  ) {
    throw new Error('Unexpected response shape from Claude');
  }

  return {
    musicPrompt: parsed.musicPrompt,
    visualPrompt: parsed.visualPrompt,
    titles: parsed.titles.slice(0, 3),
  };
}

/** Three fresh titles for the shuffle button. */
export async function generateTitles(answers: Answers): Promise<string[]> {
  const message = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 200,
    temperature: 1.0,
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
