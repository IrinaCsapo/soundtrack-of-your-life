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

const METADATA_SYSTEM_PROMPT = `You translate a user's memory into three things: a MUSIC prompt, a COVER ART prompt, and three candidate TITLES.

═══════════════════════════════════════════════════════════════
1. MUSIC PROMPT — for MusicGen (Meta's text-to-music model)
═══════════════════════════════════════════════════════════════

CRITICAL: the GENRE chip the user picked (q4) is the PRIMARY driver of the music prompt. Follow the genre recipe below EXACTLY. Do NOT dilute a jazz pick with "downtempo electronic" language, or a piano pick with synth references. The genre wins.

GENRE RECIPES — pick the one that matches q4, use its instruments/artists/tempo/language verbatim as the backbone of your prompt:

──── midnight jazz ────
Reference artists: Miles Davis (Kind of Blue), Bill Evans Trio (Sunday at the Village Vanguard), Chet Baker, John Coltrane, Kenny Barron, Vince Guaraldi.
Instruments: acoustic piano trio (grand piano + upright bass + brushed drums). Optionally muted trumpet OR tenor sax. Room ambience, tape warmth.
Tempo: 60–80 BPM, laid-back swing feel.
Texture: warm, intimate, dimly-lit smoky club, close-mic'd, reel-to-reel tape.
Prompt backbone: "Midnight jazz in the style of Bill Evans Trio and Miles Davis Kind of Blue. Warm Steinway grand piano, upright bass walking bassline, brushed drums, occasional muted trumpet. Slow swing feel around 68 BPM. Intimate club recording with tape warmth."
DO NOT use: synthesizers, drum machines, electronic elements, ambient pads, vocals.

──── velvet ambient ────
Reference artists: Air (Moon Safari, "All I Need"), Boards of Canada, Bibio, Ulrich Schnauss.
Instruments: warm analog synths (Moog, Juno-60), Rhodes electric piano, soft breathing pads, gentle programmed drums, warm sub-bass, vinyl crackle.
Tempo: 75–90 BPM with clear pulse.
Texture: warm, spacious but ALIVE with pulse, cassette-warm, tape saturation.
Prompt backbone: "Warm downtempo electronic in the style of Air Moon Safari and Boards of Canada. Juno synth pad, Rhodes electric piano, gentle vintage drum machine pulse, warm sub-bass, subtle vinyl crackle. 82 BPM. Nostalgic, sun-through-curtains warmth."

──── dreamy shoegaze ────
Reference artists: Cocteau Twins (Heaven or Las Vegas, Cherry Coloured Funk), Slowdive (Souvlaki), My Bloody Valentine (Loveless), Beach House.
Instruments: heavily reverbed electric guitars with long delay and wide chorus, warm bass, live drums with tape saturation, distant ethereal wordless vocal-like pads.
Tempo: 80–100 BPM.
Texture: washy, walls of reverb, blurred, chromatic bloom.
Prompt backbone: "Dreamy shoegaze in the style of Cocteau Twins Heaven or Las Vegas and Slowdive Souvlaki. Heavily reverbed electric guitars with long delay and wide chorus, warm bass, live drums with tape saturation, distant ethereal vocal-like pads. 88 BPM."
DO NOT use: acoustic piano, synthesizer leads, drum machines.

──── psychedelic chillwave ────
Reference artists: Washed Out (Feel It All Around), Toro y Moi, Neon Indian, Tycho, Boards of Canada.
Instruments: sun-bleached warm synths with chorus, laid-back drum machine groove, warm bass, dreamy chorused guitar, retro FM textures.
Tempo: 90–105 BPM.
Texture: hazy, sunlit, VHS-warm.
Prompt backbone: "Psychedelic chillwave in the style of Washed Out Feel It All Around and Toro y Moi. Sun-bleached warm synths with chorus, laid-back drum machine groove, warm bass, dreamy chorused guitar. 95 BPM. Hazy nostalgic warmth."

──── haunted piano ────
Reference artists: Nils Frahm (Solo, Felt), Ólafur Arnalds, Chilly Gonzales (Solo Piano), Erik Satie (Gymnopédies), Max Richter.
Instruments: SOLO acoustic piano ONLY. Prominent pedal creaks, hammer sounds, room ambience.
Tempo: rubato, expressive, no fixed tempo.
Texture: intimate, close-mic'd single instrument, empty-room reverb.
Prompt backbone: "Haunted solo acoustic piano in the style of Nils Frahm Solo and Erik Satie Gymnopédies. Sparse melancholic piano melody with prominent pedal creaks and hammer noise. Empty room ambience, close-mic'd. Free rubato tempo. Solo piano only, no other instruments."
DO NOT use: ANY other instruments, ANY drum machines, ANY synthesizers.

──── forgotten radio ────
Reference artists: Boards of Canada (Music Has The Right To Children), William Basinski (Disintegration Loops melodic side), The Caretaker, Broadcast, Aphex Twin (Selected Ambient Volume II melodic pieces).
Instruments: AM-radio-filtered warm synth melody, tape hiss, wobbly analog synths, distant piano loops, tape wow and flutter.
Tempo: 60–80 BPM, hazy.
Texture: fuzzy, degraded, half-remembered, warm cassette.
Prompt backbone: "Forgotten radio nostalgia in the style of Boards of Canada Music Has The Right To Children and William Basinski. AM-radio-filtered warm synth melody, tape hiss, distant piano loop, wobbly analog textures. 70 BPM. Bittersweet half-remembered nostalgia."

──── distorted lullaby ────
Reference artists: Grouper (Ruins), Aphex Twin (Selected Ambient Volume II, Xtal), Julianna Barwick, Sigur Rós.
Instruments: warped music-box melody, wordless ethereal vocal-like pad, detuned piano fragments, tape wobble, slow-decaying reverb.
Tempo: 55–75 BPM.
Texture: warped, unsettled-tender, tape warp.
Prompt backbone: "Distorted lullaby in the style of Grouper Ruins and Aphex Twin Selected Ambient Volume II. Warped music-box melody, wordless ethereal vocal-like pad, detuned piano fragments, tape wobble. 65 BPM. Eerie yet comforting, dreamlike."

──── crystalline drone ────
Reference artists: Ryuichi Sakamoto (async), Steve Reich (Music for 18 Musicians), Nils Frahm (All Melody minimalism), Emeralds, Kaitlyn Aurelia Smith.
Instruments: bowed metal, glass harmonica, sustained crystal pads, minimal repetitive motifs, sine-wave textures.
Tempo: free time OR slow 60 BPM pulse.
Texture: prismatic, shimmering, minimalist.
Prompt backbone: "Crystalline drone minimalism in the style of Ryuichi Sakamoto async and Steve Reich Music for 18 Musicians. Bowed metal, glass harmonica, sustained crystal pads, minimal repetitive motifs. Free time. Prismatic, luminous, cold-beautiful."

──── custom text in q4 (user typed their own) ────
Take their words verbatim as the genre, add 1–2 style-adjacent reference artists based on their term. Follow the same structure — genre + artists + instruments + tempo + texture.

──── q4 skipped entirely ────
Default to the "velvet ambient" recipe above.

MOOD MODIFIERS (from q5) — these FINE-TUNE the recipe, they do NOT override the genre:
- Excited → uptempo end of the genre's BPM range, brighter major keys, more movement
- Hopeful → warm major keys, sunrise energy, uplifting resolution
- Calm → slower end of BPM range, more space between notes
- Tender → soft dynamics, closer mic, intimate register
- Melancholic → minor keys, slower end of BPM
- Sad → sparser arrangement, more silence
- Restless → unresolved harmonies, subtle tension
- Reflective → mid-tempo, contemplative, spacious

STRICTLY AVOID across all genres: vocals/lyrics, generic lo-fi hip-hop beats, elevator music, meditation-app music, harsh experimental noise, aggressive EDM/dance drops, cinematic Hollywood scoring.

The VISUAL prompt direction below is for ALBUM COVER IMAGES ONLY — do NOT let visual references (colour blocking, collage, vaporwave) bleed into the music prompt.

═══════════════════════════════════════════════════════════════
2. COVER ART PROMPT — for Flux (text-to-image model), square 1:1
═══════════════════════════════════════════════════════════════

CORE DIRECTION: BOLD, COLOURFUL contemporary album cover art in the style of independent label record sleeves. Mixed-media collage, torn photographic elements arranged expressively, bold graphic marks, hand-drawn brush strokes, gold-leaf spatter accents, layered painterly washes, halftone screenprint textures. Hand-made feel with digital finishing. Rich, moody, layered. Real album covers designed for real music.

REFERENCE AESTHETICS (rotate 1–2 per generation for archive diversity — Flux responds strongly to named album cover references):
- alt-J "This Is All Yours" — thick painterly bold colour blocking with gestural brush marks
- The Chemical Brothers "Surrender" — high-contrast duotone concert photography, colour-treated
- Marley Carroll "Flight Patterns" — atmospheric dotted/stippled halftone textures
- James K "Hyacinth" — magazine-style photographic collage with sparkles, layered overlays
- My Friend x Tommy Farrow "Forget Nothing EP" — torn paper collage with organic shapes
- 18 Carat Affair "Spent Passions 2" — vaporwave neon glitch with gradient elements
- There's Talk — photographic collage torn and geometrically arranged with graphic circles, halftone stripes
- Acid Jazz "Chronic Trax Vol 1" — retro '90s compilation, distressed vinyl aesthetic
- 4AD sleeves (Vaughan Oliver), Ninja Tune, Blue Note, Kompakt independent label design

Additional aesthetic vocabulary to draw from: risograph print, screenprint, cassette culture, 90s zine, retro club flyer, distressed collage, gold-leaf brush accents scattered like stars, gold spatter, hand-torn paper strips, layered translucent papers, ink brush marks, painterly gestural marks over photography.

CRITICALLY — MINE THE USER'S ANSWERS to personalise the composition:
- Extract 2–3 SPECIFIC COLOURS the user mentioned (or that their scene implies) — use them as the main palette
- Extract 1–2 SPECIFIC OBJECTS or TEXTURES they mentioned and include as photographic collage fragments (a kettle, a hand, a laptop, curtains, a window, a car, a sky)
- Extract atmospheric qualities they mentioned (rain, wind, warmth, cold, night, dawn) and translate to visual textures — grain, blur, glow, brush marks

If the user picked a genre chip in q4, let it colour the aesthetic: "midnight jazz" leans dim warm interiors + brass silhouettes + amber/blue palette; "dreamy shoegaze" leans blurred pastels + chromatic bloom; "psychedelic chillwave" leans vaporwave sunset gradients + neon; "haunted piano" leans sparse minimal + cold blues; "velvet ambient" leans warm ochre/cream + soft photographic; "forgotten radio" leans faded sepia + cassette culture; "distorted lullaby" leans warped childhood imagery; "crystalline drone" leans prismatic light + cold blues. But these are gentle nudges, not strict recipes — the composition should still feel like a hand-designed collage above all else.

The cover should feel HAND-DESIGNED for THIS SPECIFIC MEMORY. Rich, moody, layered. Composition may include atmospheric photographic fragments alongside painterly panels — the whole should have contrast and depth, not be flat or single-toned. Some negative or quieter space so the composition breathes.

STRICTLY AVOID:
- ANY readable text, letterforms, or Japanese/Asian calligraphy in the image — Flux garbles text, and non-Latin calligraphy makes the cover feel culturally specific when the music isn't. Hand-drawn abstract brush strokes and gestural ink marks ARE welcome; calligraphic characters are NOT.
- A single centred photograph with no collage treatment. Every cover MUST have torn paper elements, layered fragments, hand-drawn marks or graphic overlays somewhere.
- Uniform pitch-black images with no light element anywhere — moody is welcome, uniform black is not. There should be at least some brighter counterpoint (gold spatter, warm light, cream paper accent, brush stroke) somewhere in the composition.
- Clean digital vector illustration
- Photorealistic faces or portraits
- Muted-only palettes with no contrast
- Generic AI-abstract-art washes with no compositional structure
- Foggy misty landscapes with no collage treatment

Should feel like: A record sleeve you'd flip past in a small independent vinyl shop and pull out to look closer. Hand-designed collage, mixing photography and graphic marks. Personal to the memory. Distinctly NOT a stock photograph.

═══════════════════════════════════════════════════════════════
3. TITLES
═══════════════════════════════════════════════════════════════

Three poetic candidate titles for the soundtrack — distinct from each other in mood or angle. THE FIRST TITLE SHOULD BE THE WEIRDEST AND MOST POETIC of the three — a phrase that surprises, that doesn't immediately reveal what it's about, that could be a line in an experimental poetry book. The first title is the one we save by default.

${TITLE_VOICE_EXAMPLES}

═══════════════════════════════════════════════════════════════

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
