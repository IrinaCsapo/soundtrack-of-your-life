# Soundtrack of Your Life

A small tool in Irina's Cabinet of Delights — answer six questions about a moment, get a custom lo-fi/ambient track with a poetic title.

This is the **v0.3 scaffold**: real music generation, smart Claude-translated prompts, three candidate titles per soundtrack with shuffle, and a genre selector with curated chips + custom input.

---

## What works right now

- **Landing page** at `/`
- **Six-question flow** at `/questions` — five memory questions + one genre question (chips + custom). All except Q1–Q3 are skippable.
- **Smart prompt translation** via Claude Haiku — each set of answers gets a custom-tailored MusicGen prompt with genre, instruments, mood, tempo, texture.
- **Three candidate titles** generated alongside the music prompt, displayed on the reveal page for the user to pick.
- **Shuffle** — user can request three fresh titles via `/api/titles` if none of the originals fit.
- **Music generation** via Replicate (MusicGen stereo-large), with a status-polling reveal page.
- **Audio player** with brass progress ring + breathing animation when playing.
- **Copy link, download MP3, make another** actions.

## First-time setup

You need Node 18+, a Replicate API token, and an Anthropic API key.

```bash
npm install
```

Create `.env.local` in the project root:

```
REPLICATE_API_TOKEN=r8_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxx
```

Get tokens from:
- Replicate: [replicate.com/account/api-tokens](https://replicate.com/account/api-tokens)
- Anthropic: [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys)

Then:

```bash
npm run dev
```

## Cost per generation (~30s clip)

- Replicate (MusicGen stereo-large): ~$0.02
- Anthropic (Claude Haiku, ~600 tokens in + 200 tokens out for prompt + titles): ~$0.0002
- Anthropic (Claude Haiku, shuffle titles only): ~$0.0001 per shuffle
- **Total per soundtrack**: ~$0.02

## How the generation flow works

1. User submits the six answers → `POST /api/generate`
2. Claude Haiku produces `{ musicPrompt, titles[3] }` from the answers + genre
3. The route fetches the current latest version of `meta/musicgen` on Replicate
4. Kicks off a Replicate prediction with the music prompt; returns prediction ID + the three titles
5. Browser stashes the answers + titles in `sessionStorage`, redirects to `/soundtrack/[prediction-id]`
6. Reveal page polls `GET /api/soundtrack/[id]/status` every 2 seconds, shows title candidates immediately, displays the audio player when ready
7. Shuffle button calls `POST /api/titles` for three fresh candidates

## Project shape

```
app/
  layout.tsx                          root layout, fonts, warm dark theme
  page.tsx                            landing
  globals.css                         tailwind + theme variables
  questions/page.tsx                  the 6-question flow + GenreSelector
  soundtrack/[slug]/page.tsx          reveal page (titles + status + player)
  api/
    generate/route.ts                 Claude → prompt + titles, kicks off Replicate
    titles/route.ts                   Shuffle: three fresh titles
    soundtrack/[id]/status/route.ts   Returns current prediction status
lib/
  questions.ts                        the six questions + genre options
  claude.ts                           Anthropic client + prompt/title generation
  replicate.ts                        Replicate client + model version resolution
  musicPrompt.ts                      legacy template fallback (no longer used)
```

## What's next, in order

1. **Subdomain** — finish wiring `soundtrack.irina.love` at Vercel + GoDaddy
2. **Supabase persistence** — soundtracks stored server-side, real shareable URLs
3. **SoundCloud OAuth + opt-in publish** — single Cabinet account, AI-flagged uploads
4. **OG image rendering** for link unfurls
5. **Client-side MP4 generation** for social shares

## Theme

CSS variables in `app/globals.css`. Five colors, tune to taste.

## Deploy

Push to GitHub via GitHub Desktop → Vercel auto-deploys. Add both `REPLICATE_API_TOKEN` and `ANTHROPIC_API_KEY` in Vercel's Environment Variables UI.
