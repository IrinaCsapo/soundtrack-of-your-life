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

CORE AESTHETIC: WARM DOWNTEMPO ELECTRONIC with GROOVE, PULSE, and dreamy atmosphere. Not pure ambient wash. There must always be SOMETHING MOVING — a soft kick pattern, a warm bass pulse, a Rhodes arpeggio, a breathing pad rhythm. Palatable, listenable, beautiful, but with life and motion in it.

REFERENCE ARTISTS (choose 2–3 per generation and rotate — MusicGen responds to named artist references, so this both diversifies output AND anchors the vibe). Weave the references naturally into the prompt:

- Air (Moon Safari era, "All I Need") — warm analog synth downtempo, mellow French rhythm
- Cocteau Twins (Cherry Coloured Funk) — ethereal reverbed dreamy guitars, ethereal pads
- Aphex Twin — his MELODIC AMBIENT works only (Xtal, Heliosphan) — soft-pulsing melodic ambient techno, NOT his harsh/experimental stuff
- The Chemical Brothers — the ATMOSPHERIC side ("The Darkness That You Fear") — cinematic electronic with movement, not big beat
- Björk (Big Time Sensuality era) — playful rhythmic electronic with warm textures
- Andrew Prahlow (Outer Wilds soundtrack) — atmospheric acoustic and orchestral ambient
- System Olympia (6am Romance) — retro synth romance, dreamy Italo
- Boards of Canada — hazy nostalgic downtempo electronic
- Confidence Man (mellow tracks) — indie electronic warmth
- Magenta Club (Avec Toi) — French chill electronic

Describe:
- GENRE (draw from: downtempo electronic, chillwave, dream pop, atmospheric big beat, warm analog synth, ambient techno with pulse, French downtempo, Italo dreamwave)
- INSTRUMENTS (warm analog synths — Moog, Juno, Rhodes electric piano, mellotron pads, soft acoustic guitar, dreamy reverb-drenched electric guitar, gentle programmed drums or soft drum machine, warm bass pulse, vinyl crackle, subtle arpeggios)
- MOOD (nostalgic, tender, dreamy, mysterious, warm, melancholic, contemplative, occasionally playful — always with emotional weight)
- TEMPO (70–95 BPM — slow to mid-tempo, but WITH PULSE; there should always be a sense of gentle motion)
- TEXTURE (warm, analog, slightly grainy, spacious but ALIVE — pads breathe, arpeggios pulse, subtle rhythmic elements throughout)

If q4 specifies a genre, weave it through the references — "shoegaze" leans Cocteau Twins washy reverb, "jazz" becomes downtempo Rhodes jazz, "psychedelic chillwave" leans Air Moon Safari or Aphex Twin melodic ambient, "haunted piano" leans Prahlow, "midnight jazz" leans System Olympia synth romance, "forgotten radio" leans Boards of Canada nostalgia, "distorted lullaby" leans Cocteau Twins, "crystalline drone" leans Aphex Twin Xtal.

If q5 specifies a mood, shift emphasis — Excited/Energised → Chemical Brothers atmospheric + Björk warmth; Melancholic/Sad → Cocteau Twins + Prahlow; Calm/Tender → Air Moon Safari; Restless → Aphex Twin pulsing; Reflective → Prahlow atmospheric acoustic; Hopeful → Air sunny mornings.

STRICTLY AVOID: pure static ambient wash without any rhythm, cinematic scoring drones, harsh experimental noise, aggressive dance BPMs over 100, big beat drops, vocals or lyrics, generic lo-fi hip-hop beats, elevator music, meditation music. Do NOT include "Brian Eno" or "Music for Airports" or any pure-ambient reference — those pushed the previous prompts too far into static wash territory.

IMPORTANT: the VISUAL prompt direction below is for ALBUM COVER IMAGES ONLY — do NOT apply that experimental aesthetic to the music. The music stays in the warm downtempo electronic / dreamwave / atmospheric-with-pulse register.

2. A VISUAL generation prompt for Flux (text-to-image model) for the soundtrack's square (1:1) album cover.

CORE DIRECTION: BOLD, COLOURFUL contemporary album cover art. Think independent label record sleeves — mixed-media collage, bold graphic marks, torn photographic elements arranged expressively, saturated colour blocking, vintage cassette culture, hand-made feel with digital finishing. Real album covers designed for real music.

REFERENCE AESTHETICS (rotate 1–2 per generation to keep the archive diverse):
- alt-J "This Is All Yours" — thick painterly bold colour blocking, primary colours slashed across white ground
- The Chemical Brothers "Surrender" — high-contrast duotone concert photography, colour-treated crowds
- Marley Carroll "Flight Patterns" — atmospheric dotted/stippled halftone textures forming shapes
- James K "Hyacinth" — magazine-style photographic collage with sparkles, layered overlays, scattered text-like fragments
- My Friend x Tommy Farrow "Forget Nothing EP" — torn paper collage with organic blue/orange shapes, vintage vinyl label typography
- 18 Carat Affair "Spent Passions 2" — vaporwave neon glitch, gradient neon type, cybernetic elements, ballerina statue with chromatic aberration
- There's Talk — photographic collage torn and geometrically arranged with graphic circles, halftone stripes, colour gradient blocks
- Acid Jazz "Chronic Trax Vol 1" — retro '90s compilation aesthetic, bold serif typography, blue and orange bands, distressed record photograph
- Ninja Tune / Warp / 4AD / Blue Note-style independent label record sleeves — bold graphic, colour-blocked, textural

Aesthetics also welcome: painterly gestural marks over photography, cassette culture, vaporwave-adjacent, retro club flyer, distressed screenprint, riso print, 90s zine.

CRITICALLY: MINE THE USER'S ANSWERS for specific visual details:

- Extract 2–3 SPECIFIC COLOURS from what they wrote. If they mention "golden afternoon" → gold + honey + warm cream palette. If "cold blue morning" → deep blue + steel + off-white. If "dusk" → violet + peach + amber. If they mention no specific colours, choose a bold saturated palette that matches the emotional register.
- Extract 1–2 SPECIFIC OBJECTS or TEXTURES they mentioned and include as photographic collage elements — a kettle, a road, a bed, an old book, hands, curtains, a car interior, a sky. These become real photographic fragments in the collage, not the whole image.
- Extract atmospheric qualities they mentioned (rain, wind, warmth, cold, motion) and translate to visual textures — film grain, water droplets, motion blur, warm light glow, cold shadow.

The cover should feel like it was designed specifically for THEIR memory, using visual language drawn from what they wrote.

COMPOSITION NOTE: the cover benefits from some negative or quieter space somewhere in the frame (a solid colour block, an area of quiet paint, empty photographic sky) so the composition breathes. Don't fill every square inch with detail.

Be specific about:
- MEDIUM (mixed-media collage / painterly abstract with photographic fragments / duotone photography / cassette culture / vintage typographic design / halftone print / riso print)
- COLOUR PALETTE (specific bold saturated colours drawn from user's answers, NOT muted pastels)
- KEY VISUAL ELEMENTS drawn from their memory (specific objects, textures, atmospheric qualities they mentioned) — these should appear as concrete photographic or painted fragments, not as a whole literal scene

STRICTLY AVOID:
- Watercolour dreamy abstract washes with no clear subject (this is what our current covers ALL look like — we're moving away from this)
- Muted pastel palettes — go saturated
- Generic AI-abstract-art with no reference to the memory
- Foggy misty landscape defaults
- Cute illustration, vector art, geometric perfection
- Photorealistic portraits, faces, generic stock photography
- Pure landscape photography without collage/graphic elements
- Any actual readable text or letterforms — Flux garbles text badly and it always looks like broken AI-generated typography. NO titles, artist names, or any words in the image itself.

Should feel like: A record sleeve you'd flip past in a small vinyl shop and pull out to look closer. Hand-designed, mixing photography and graphic marks. Bold, personal, curated. Distinctly NOT generic AI art.

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
      ? `Genre they want (q4): ${answers.q4}`
      : 'Genre: not specified (use lo-fi ambient default)',
    answers.q5
      ? `Their current mood (q5 — use this to inform emotional register of the music): ${answers.q5}`
      : 'Mood: not specified',
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
