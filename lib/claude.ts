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

──── sweet jazz ────
Reference artists: Miles Davis (Kind of Blue), Tour-Maubourg, Berlioz (contemporary jazz-house), Move 78, Bill Evans Trio, Chet Baker, Kenny Barron.
Instruments: acoustic piano trio (grand piano + upright bass + brushed drums), Rhodes electric piano warmth, optionally muted trumpet OR tenor sax OR soft flugelhorn, subtle jazz-house shuffle brushed drums (Tour-Maubourg / Berlioz side), room ambience, warm tape saturation.
Tempo: 70–95 BPM — the "sweet" register runs slightly warmer and slightly more forward-motion than pure late-night jazz. Slow swing OR jazz-house shuffle both welcome.
Texture: warm, honeyed, intimate but MOVING, close-mic'd acoustic instruments, tape warmth, gently rolling groove.
Prompt backbone: "Sweet jazz in the style of Miles Davis Kind of Blue, Tour-Maubourg and Berlioz. Warm grand piano, upright bass, brushed drums with soft jazz-house shuffle, Rhodes electric piano, occasional muted trumpet. 82 BPM. Honeyed, warm, intimate room recording with tape warmth."
DO NOT use: harsh synth leads, aggressive drum machines, EDM elements, ambient wash pads, vocals, hard swing.

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
Reference artists: Nils Frahm (Says, All Melody, Solo), Max Richter (On the Nature of Daylight, Sleep, The Blue Notebooks), Ólafur Arnalds (re:member, Sunrise Session), Ryuichi Sakamoto (Merry Christmas Mr Lawrence, async piano pieces), Alva Noto x Sakamoto (Insen).
Instruments: solo grand piano leading, warm STRING QUARTET underneath (cello prominent, viola, two violins), sustained warm pads (Yamaha CP70 or Rhodes for shimmer), gentle glass-bell resonance as texture only, minimal repetitive melodic motifs.
Tempo: 55–70 BPM, gentle steady pulse or slow rubato — NOT free-time chaos.
Texture: warm NEOCLASSICAL MINIMALISM — prismatic AND melodic, shimmering but always anchored on piano and strings. Beautiful, palatable, quietly emotional.
Prompt backbone: "Neoclassical minimalism in the style of Nils Frahm All Melody and Max Richter On the Nature of Daylight. Solo grand piano leading, warm string quartet with prominent cello, sustained warm pad, gentle glass resonance as texture. 62 BPM steady pulse. Prismatic, melodic, luminous, quietly emotional."
DO NOT use: harsh synth drones, experimental noise, sine wave textures, bowed metal, glass harmonica as a lead instrument, aggressive electronics, free-time chaos, dissonance.

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

CORE DIRECTION: BOLD, COLOURFUL, HAND-DESIGNED MIXED-MEDIA COLLAGE album cover art in the style of independent label record sleeves. Torn photographic elements arranged expressively, bold graphic marks, hand-drawn brush strokes, gold-leaf spatter accents, painterly washes layered over photographic fragments, halftone screenprint textures, ABSTRACT DISPLAY TYPOGRAPHY as graphic composition elements. Rich, moody, layered — never a single centred photograph, never a plain background with something in the middle. Real album covers designed for real music.

REFERENCE AESTHETICS (name 1–2 per generation in the Flux prompt — Flux responds strongly to named album cover references):
- alt-J "This Is All Yours" — thick painterly bold colour blocking, primary colour brush marks
- The Chemical Brothers "Surrender" — high-contrast duotone concert photography with bold display typography as design element
- Marley Carroll "Flight Patterns" — stippled halftone textures forming shapes, vertical dropcap typography
- James K "Hyacinth" — magazine-style photographic collage, layered graphic overlays, scattered abstract type fragments
- My Friend x Tommy Farrow "Forget Nothing EP" — torn paper collage with organic shapes, vintage vinyl label typography
- 18 Carat Affair "Spent Passions 2" — vaporwave neon glitch with gradient chrome typography
- There's Talk — photographic collage torn and geometrically arranged with abstract graphic shapes
- Acid Jazz "Chronic Trax Vol 1" — retro '90s compilation with bold slab-serif typography as full design element
- 4AD sleeves (Vaughan Oliver), Ninja Tune, Blue Note (Reid Miles), Kompakt independent label design

Additional aesthetic vocabulary: risograph print, screenprint, cassette culture, 90s zine, retro club flyer, distressed collage, gold-leaf brush accents scattered like stars, gold spatter, hand-torn paper strips, layered translucent papers, ink brush marks, painterly gestural marks over photography, distressed display typography, single dramatic dropcap letter as compositional anchor.

═══ CRITICALLY — MINE THE USER'S EXACT WORDS FOR THE PALETTE ═══

The user wrote about a specific moment. Read their answers CAREFULLY and extract:

- COLOURS THEY LITERALLY NAMED. If they wrote "purple laptop light" → PURPLE goes in the palette. "Blue morning" → BLUE. "Golden hour" → GOLD + AMBER. "Red car" → RED. If they wrote no colour words explicitly, infer 2–3 colours from the SCENE they described (a beach at dusk = orange + violet + navy; a smoky bar = amber + tobacco + ink).
- OBJECTS THEY MENTIONED as torn photographic fragments — a kettle, a hand, a laptop, curtains, a car, a window, a sky, a book, tea, a phone, a light, a road.
- ATMOSPHERIC QUALITIES they described translated to visual textures — rain becomes water droplet texture, wind becomes motion blur, warmth becomes glow, cold becomes hard shadow, night becomes grain.

The palette must feel like it belongs to THEIR memory, not a generic Cabinet palette. If they said "purple laptop light one hand hovering" — the cover better be PURPLE-dominant with a hand fragment somewhere.

═══ TYPOGRAPHIC ELEMENTS ARE NOW WELCOME (as abstract graphic marks only) ═══

Many of the best reference covers above use typography as composition. So DO include:
- Large abstract display letters as design anchors (a giant distressed "M" or "&" in a corner)
- Distressed / eroded slab-serif letters
- Vertical column type stacks (like Marley Carroll's cover)
- Cutout letter shapes as photographic frames
- Scattered abstract type fragments in the collage
- Vintage vinyl label-style typography rings

Do NOT try to render readable words, artist names, or titles — Flux will garble them and it looks broken. But abstract SINGLE LETTERS and typographic MARKS as compositional elements are welcome and often what separates a real record sleeve from a generic AI image.

═══ GENRE NUDGE ═══

If the user picked a genre chip in q4, let it colour the aesthetic: "sweet jazz" leans warm ochre + Blue Note typography influence + brass silhouettes + honeyed amber palette; "dreamy shoegaze" leans blurred pastels + chromatic bloom; "psychedelic chillwave" leans vaporwave sunset gradients + neon chrome type; "haunted piano" leans sparse minimal + cold blues; "velvet ambient" leans warm ochre/cream + soft photographic; "forgotten radio" leans faded sepia + cassette culture + vintage compilation type; "distorted lullaby" leans warped childhood imagery + tape-damaged typography; "crystalline drone" leans prismatic light + cold blues + minimalist type. Gentle nudges, not strict recipes.

═══ STRICTLY AVOID ═══

- A single centred photograph with no collage treatment. Every cover MUST have torn paper edges, layered fragments, hand-drawn marks, graphic overlays, OR abstract type somewhere. If it looks like a stock photo with a filter, you failed.
- Descriptive photographic scenes without collage. If Claude finds itself writing "a photograph of X in Y", REBALANCE — it should be "torn photographic fragments of X layered with painterly Y on cream paper ground".
- Readable words, titles, artist names, or Japanese/Asian calligraphy. Abstract single letters, distressed type fragments, and gestural ink brush marks ARE welcome. Real words are NOT.
- Uniform pitch-black images. Moody is welcome, uniform black is not — at least one bright counterpoint (gold spatter, warm light, cream paper, brush stroke, coloured shape) somewhere.
- Watercolour dreamy washes with no clear compositional structure.
- Clean digital vector illustration.
- Photorealistic faces or portraits.
- Muted-only palettes with no contrast.

Should feel like: A record sleeve you'd flip past in a small independent vinyl shop and pull out to look closer. Hand-designed collage, mixing torn photography, layered paper, brush strokes, graphic marks, and abstract type. Personal to the user's memory, drawn from their exact words. Distinctly NOT a stock photograph.

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
