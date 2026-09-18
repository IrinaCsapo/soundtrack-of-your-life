# Soundtrack of Your Life — Project Context

Portable context summary for handing off to a new chat session. Paste into any new conversation to bring another Claude instance up to speed on the project.

---

## The premise

**Soundtrack of Your Life** is a small emotional-AI web tool. The user describes a moment or memory in a few short answers, and the tool generates back a custom 30-second track, a mixed-media collage cover, a poetic title, and a small poem made of their own words — as a shareable artifact of the moment.

- Live at: `soundtrack.irina.love`
- Part of Irina Csapo's `Cabinet of Delights` (`irina.love`) — a collection of small "tools of delight."
- Built solo, vibe-coded, shipped to production.

---

## Design philosophy

- **Not a productivity app.** A tool of delight. Warm, poetic, considered. Anti-corporate.
- **Cabinet voice.** Every microcopy is written in the "Cabinet" voice — including loading states ("Stitching the memory into music"), error states ("The music got lost on the way"), and moderation refusals. The tool never sounds like an app.
- **Sound as emotional language.** The premise is that sound is one of the most underused emotional languages in AI. Genre selectors are not emotional; a moment is.
- **Ship craft, not features.** Every screen has design attention. Small details matter (auto-capitalising the first letter of answers, tabular-nums on the progress %, character-limit counters that go brass at the limit, etc.).

---

## Tech stack

- **Framework:** Next.js 15 (App Router) + TypeScript
- **Styling:** Tailwind CSS v3.4, Framer Motion for animations
- **Fonts:** Fraunces (display, italic with SOFT axis), Crimson Pro (body italic), Inter (small-caps labels)
- **Palette:** `paper` #ECE7DC (warm cream), `ink` #0E0D11 (warm near-black), `warmth` #1A1719 (dark, NOT cream — common confusion), `brass` #C9B79C (accent)
- **AI:**
  - Anthropic Claude Haiku 4.5 (`claude-haiku-4-5-20251001`) — music prompt + visual prompt + titles + moderation
  - Meta MusicGen `stereo-large` at 30s duration via Replicate — music generation (~90–120s per track)
  - Flux Dev via Replicate — cover art generation
- **Database:** Supabase (Postgres + Storage for audio and covers)
- **Deployment:** Vercel + custom subdomain via GoDaddy CNAME
- **Analytics:** Umami (self-hosted at `irina-umami.vercel.app`)

---

## The flow (4 questions)

1. `Take me there. Where and when?` (text, required, 70-char cap)
2. `What can you hear, touch, or notice?` (text, required, 70-char cap)
3. `What does this moment want to whisper to you?` (text, skippable, 70-char cap)
4. `What does this feeling sound like?` (genre chip picker, skippable, 70-char cap on custom text)

(A 5th mood question was removed — didn't visibly influence output enough to earn its place.)

**Genre chips:** distorted lullaby, dreamy shoegaze, psychedelic chillwave, haunted piano, velvet ambient, sweet jazz, forgotten radio, crystalline drone.

Each chip maps to a specific "recipe" of reference artists, instruments, tempo, and DO/DO-NOT rules in the Claude prompt. Examples:
- **sweet jazz** → Miles Davis (Kind of Blue), Tour-Maubourg, Berlioz, Move 78 → acoustic piano trio + Rhodes + brushed drums + jazz-house shuffle at 70–95 BPM
- **crystalline drone** → Nils Frahm, Max Richter, Ólafur Arnalds, Sakamoto → solo grand piano + string quartet + warm pads + glass resonance as texture only
- **haunted piano** → Nils Frahm Solo, Erik Satie, Julianna Barwick → acoustic piano + wordless female humming as breathy vocal texture

---

## Key files

- `lib/claude.ts` — the big prompt-engineering file. Contains the metadata system prompt with all 8 genre recipes for music, the cover-art prompt with reference album covers (alt-J, Chemical Brothers, Marley Carroll, James K, Forget Nothing, 4AD, Blue Note, Ninja Tune, etc.), and the titles prompt.
- `lib/questions.ts` — question definitions + `GENRE_OPTIONS` array
- `lib/replicate.ts` — MusicGen and Flux model configuration
- `lib/supabase.ts` — Supabase client + `SoundtrackRow` type
- `lib/moderation.ts` — Claude-based moderation (5 categories: ALLOWED / PROFANITY / EXPLICIT / HARMFUL / UNFIT) with Cabinet-voiced rejection messages
- `app/page.tsx` — homepage with ping-pong video background
- `app/questions/page.tsx` — 4-question flow with gradient crossfade + submitting overlay
- `app/soundtrack/[slug]/page.tsx` — reveal page (client component)
- `app/soundtrack/[slug]/layout.tsx` — server-side `generateMetadata` for OG tags
- `app/soundtrack/[slug]/opengraph-image.tsx` — dynamic OG image via `next/og` with Fraunces italic
- `app/archive/page.tsx` — public Cabinet grid of shared soundtracks
- `app/about/page.tsx` — the about page
- `app/admin/page.tsx` — password-gated admin (list / hide / delete)
- `app/api/generate/route.ts` — main generation pipeline (moderation → Claude metadata → parallel MusicGen + Flux + Supabase insert)
- `app/api/soundtrack/[id]/status/route.ts` — polling endpoint with background asset persistence
- `app/api/soundtrack/[id]/extend/route.ts` — "Keep it going" continuation route (built, currently feature-flagged OFF)

---

## Cover art visual system

- **Medium (constant):** mixed-media collage in the style of independent record label sleeves. Torn photographic elements, layered painterly washes, hand-drawn brush strokes, gold-leaf spatter accents, halftone screenprint textures, abstract typographic elements as graphic marks.
- **Reference sleeves** (rotate per generation): alt-J *This Is All Yours*, Chemical Brothers *Surrender*, Marley Carroll *Flight Patterns*, James K *Hyacinth*, My Friend x Tommy Farrow *Forget Nothing EP*, 18 Carat Affair *Spent Passions 2*, There's Talk, Acid Jazz *Chronic Trax Vol 1*, plus 4AD (Vaughan Oliver) / Ninja Tune / Blue Note (Reid Miles) / Kompakt.
- **Personalisation:** Claude mines the user's answers for specific colours, objects, and atmospheric qualities — the palette must come from words the user actually wrote.
- **Rules:** No readable text/titles (Flux garbles), no Japanese/Asian calligraphy (culturally mismatched), no single centred photograph, no pitch-black uniform images.

---

## Waiting UX (the hardest UX problem)

MusicGen takes 90–120s. Cover takes 15–30s. In consumer AI that wait is where you lose people. The reveal page designs for anticipation, not loading:

- Video gradient background (silent, looping, `bg_gradient_4_web.mp4` or similar in `/public`) with 25% ink overlay + top/bottom vignette for text readability
- Rotating in-voice loading messages ("Stitching the memory into music", "The music is finding you", etc.)
- Triple-ripple brass pulse in place of the play button
- Fake progress % that ramps from 5% → 90% over 100 seconds, holds at 90%, jumps to 100% on completion
- Transparent time expectation ("this can take a minute or two — keep this tab open") above the cover
- Cover placeholder is cream paper (`bg-paper` + subtle brass shimmer) so a still-generating cover reads as "forming" not "broken"
- Distinct failed-cover state ("the cover got lost on the way") if Flux errors

---

## Feature history (what's shipped, what's dormant)

**Shipped and live:**
- 4-question flow with 70-char answer caps + character counter
- Music + cover generation via Replicate
- Public Cabinet archive with cover grid
- Admin panel (hide / delete)
- OG image with Fraunces italic + title-case
- MediaSession API for iOS/Android lock-screen artwork + controls
- Auto-share to Cabinet by default (with is_public gate)
- Umami analytics
- Video background on results page (with 25% ink darkening)
- Content moderation with in-voice rejection messages
- Track titles in AP-style title case ("The Forest Can Wait")
- Genre pill on reveal page
- Site navigation (home / about / soundtrack cabinet)

**Built but feature-flagged OFF** (`KEEP_IT_GOING_ENABLED = false` in `app/soundtrack/[slug]/page.tsx`):
- "Keep it going" track extension feature using MusicGen `continuation: true` — extends 30s tracks to 60s by generating a new segment and playing them sequentially. Backend + polling + UI all wired. Turned off pending more product thinking on the UX.

**Dormant components** (on disk, unused):
- `components/VinylRecord.tsx` — a spinning purple vinyl SVG (abandoned in favour of triple-ripple pulse)
- `components/AnimatedBlobs.tsx` — ondulating colour blobs (abandoned in favour of video background)

**Deferred (roadmap):**
- Vocal generation with the user's own words (ElevenLabs + audio mixing) — too much scope for MVP
- Server-side MP3 stitching for seamless extensions
- Genre-conditional cover palettes tighter than current nudge
- Mood question v2 that visibly affects both music and cover

---

## Design language details worth knowing

- **Living background:** the reveal page uses a video (`/dark%20gradients%20Irina1-web.mp4`, spaces URL-encoded) with `object-cover` + `autoPlay muted loop playsInline`. 25% ink flat overlay + top/bottom `from-ink/70 via-ink/45 to-ink/85` gradient over the top.
- **Questions page:** Fabiana Fiesmann gradient images crossfade between question steps (1.6s ease-in-out). Same video overlay fades in when the submit button is tapped, for visual continuity into the reveal page.
- **Homepage:** ping-pong video hero (`soundtrack-hero-v3.mp4`) — plays forward then backward via `requestAnimationFrame` currentTime decrement, because browsers don't support negative playbackRate.
- **Character-counter colour** transitions: `text-paper/35` → `text-paper/70` at 45 chars → `text-brass` at the 70 limit.
- **Skip label** stays mounted with `invisible` class rather than unmounting, so tapping a genre chip doesn't cause the vertically-centred flex column to re-centre and jump.

---

## About the maker

Irina Csapo. Product designer + artist in London. Portfolio: `irina.love`. LinkedIn: `linkedin.com/in/irina.csapo`. Building the tool as part of her "Cabinet of Delights" — small emotional AI apps that treat sound and image as emotional languages rather than utilities.

Currently interviewing for product design roles at audio/AI companies (Mirelo, Katkin, etc.).

---

## How to talk to her about this project

- She thinks like a product designer: shape → craft → iterate. Not like an engineer who ships and moves on.
- She has strong opinions on visual craft (references real album cover designers, cares about typographic detail).
- She's honest when something isn't working ("the music has become slightly weird, almost too ambient, clinical, less rhythmic") and honest when it is ("love the new background it feels so much more alive").
- She'll ask for something specific, listen to trade-offs, then decide. Don't over-engineer without checking in.
- She'll defer things ("let me think about it") when she doesn't have time — respect that, don't push.
- She's vibe-coding — comfortable with the code, ships via GitHub Desktop, but doesn't want to be in the terminal.
