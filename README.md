# Soundtrack of Your Life

A small tool in Irina's Cabinet of Delights — five questions about a moment become a custom lo-fi/ambient track.

This is the **v0.2 scaffold**: the music actually generates now.

---

## What works right now

- **Landing page** at `/` — quiet invitation and a "begin" link
- **5-question flow** at `/questions` — full-screen, one at a time, soft fade transitions, keyboard-friendly, Q4 + Q5 skippable
- **Real music generation** via Replicate (MusicGen stereo-large by default)
- **Reveal page** at `/soundtrack/[id]` — polls the generation status, shows a "held breath" while waiting, then a soft audio player with the user's answers as a poem when ready, plus an MP3 download

## First-time setup

You need Node 18+ and a Replicate API token.

```bash
npm install
```

Then create a file called `.env.local` in the project root and put your Replicate token in it:

```
REPLICATE_API_TOKEN=r8_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Get a token from [replicate.com/account/api-tokens](https://replicate.com/account/api-tokens). Don't commit this file — it's in `.gitignore`.

Then:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), walk the flow. The final step kicks off a real Replicate generation (~30s for a 30-second clip, ~$0.02 per generation).

## How the generation flow works

1. User submits answers → `POST /api/generate`
2. The route translates the answers into a music prompt (see `lib/musicPrompt.ts`), kicks off a Replicate prediction, returns the prediction ID
3. Browser redirects to `/soundtrack/[prediction-id]` and polls `GET /api/soundtrack/[id]/status` every 2 seconds
4. When the prediction succeeds, the page fades in the audio player + download link

The answers are temporarily stashed in `sessionStorage` so the reveal page can render them as a soft poem. When we wire up Supabase, this moves to the database and the URLs become real shareable links.

## Project shape

```
app/
  layout.tsx                          root layout, fonts, warm dark theme
  page.tsx                            landing
  globals.css                         tailwind + theme variables
  questions/page.tsx                  the 5-question flow
  soundtrack/[slug]/page.tsx          reveal page (polls status, plays audio)
  api/
    generate/route.ts                 starts a Replicate prediction
    soundtrack/[id]/status/route.ts   returns current prediction status
lib/
  questions.ts                        the 5 questions, edit freely
  musicPrompt.ts                      template-based prompt translation
  replicate.ts                        Replicate client + model defaults
```

## What's next, in order

1. **Swap the prompt translator for Claude Haiku** — current version is a hand-crafted template, an LLM call would produce much richer prompts
2. **Title generator** — Claude Haiku returns 3 candidate titles per soundtrack, user picks
3. **Supabase** — persist soundtracks (answers, prompt, audio URL, title) so reveal pages are shareable across browsers
4. **SoundCloud OAuth + opt-in publish** — one-time auth, opt-in toggle on the reveal page
5. **OG image rendering** with `@vercel/og` for link unfurls
6. **Client-side MP4 generation** (Web Audio API + Canvas + MediaRecorder) for socials

## Theme

The aesthetic lives in `app/globals.css` as five CSS variables — `--ink`, `--warmth`, `--paper`, `--whisper`, `--brass`. Tune freely. Fonts are Crimson Pro (serif) and Inter (sans), loaded via `next/font/google`.

## Swapping the music model

Edit `lib/replicate.ts`. The default is `meta/musicgen` with `model_version: 'stereo-large'`. To try Stable Audio instead, change `MUSIC_MODEL` to `'stackadoc/stable-audio-open-1.0'` and adjust the input keys — Stable Audio uses `seconds_total` instead of `duration`.

## Deploy

When ready: push to GitHub via GitHub Desktop, then import into Vercel (free Hobby tier). Add `REPLICATE_API_TOKEN` in Vercel's project settings → Environment Variables. Point a domain at the deployment.
