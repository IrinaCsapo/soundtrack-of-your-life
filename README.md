# Soundtrack of Your Life

A small tool in Irina's Cabinet of Delights — answer a few questions about a moment, get a custom lo-fi/ambient track with a cinematic album cover and a poetic title.

This is the **v0.4 scaffold**: real music + cover generation, Claude-translated prompts, three candidate titles with shuffle, and a public archive at `/archive` for soundtracks people choose to share.

---

## What works right now

- **Landing page** at `/`
- **Four-question flow** at `/questions` — three memory questions + one genre. Q3 and Q4 skippable.
- **Smart prompt translation** via Claude Haiku — one call returns music prompt, visual prompt, and three candidate titles.
- **Music generation** via Replicate (MusicGen stereo-large, 60s duration).
- **Cover generation** via Replicate (Flux Dev, square 1:1, photographic/cinematic style) — fires in parallel with music.
- **Reveal page** with the cover as album art and a brass progress ring play button centered on it.
- **Three candidate titles** + shuffle, persisted server-side once chosen.
- **Public archive** at `/archive` — anonymous, opt-in via a toggle on the reveal page.
- **Supabase persistence** — soundtracks survive past Replicate's 24-hour URL expiration; MP3s + covers mirrored to Supabase Storage in the background after generation.

## First-time setup

You need Node 18+, a Replicate API token, an Anthropic API key, and a Supabase project.

```bash
npm install
```

Create `.env.local` in the project root:

```
REPLICATE_API_TOKEN=r8_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
SUPABASE_SECRET_KEY=sb_secret_xxxxxxxxxxxxxxxxxxxxxxxx
```

Get tokens from:
- Replicate: [replicate.com/account/api-tokens](https://replicate.com/account/api-tokens)
- Anthropic: [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys)
- Supabase: [supabase.com](https://supabase.com) → project settings → API Keys

**Supabase setup** (one-time):
1. Run the SQL migration in `supabase/migrations/0001_soundtracks.sql` (or paste it into the SQL Editor — same content as in this README appendix).
2. Create two public Storage buckets: `audio` and `covers`.

Then:

```bash
npm run dev
```

## Cost per soundtrack (~60s clip)

- Replicate MusicGen stereo-large (60s): ~$0.04
- Replicate Flux Dev (1 image, 1:1): ~$0.025
- Anthropic Claude Haiku (prompts + titles, ~1k tokens total): ~$0.0002
- Anthropic Claude Haiku (shuffle titles, optional): ~$0.0001 per shuffle
- Supabase Storage: free at MVP scale
- **Total per soundtrack**: ~$0.07

## Generation flow

1. User submits 4 answers → `POST /api/generate`
2. Claude Haiku produces `{ musicPrompt, visualPrompt, titles[3] }` in one call
3. Replicate predictions for music (MusicGen) + cover (Flux Dev) are kicked off in parallel
4. Soundtrack row is inserted into Supabase `soundtracks` table
5. Browser redirects to `/soundtrack/[prediction-id]`
6. Reveal page polls `GET /api/soundtrack/[id]/status` every 2 seconds
7. When music or cover succeeds, status endpoint returns the Replicate URL immediately AND schedules a background download → Supabase Storage upload (via `after()`)
8. Subsequent status polls return the persisted Supabase URL
9. User picks a title → `PATCH /api/soundtrack/[id]` saves selection
10. User toggles "share to the cabinet" → `PATCH /api/soundtrack/[id]` sets `is_public = true`
11. Archive page (`/archive`, server component, revalidates every 60s) queries Supabase for public soundtracks

## Project shape

```
app/
  layout.tsx                          root layout, fonts, warm dark theme
  page.tsx                            landing
  globals.css                         tailwind + theme variables
  questions/page.tsx                  4-question flow + GenreSelector
  soundtrack/[slug]/page.tsx          reveal page with cover + player + opt-in toggle
  archive/page.tsx                    public archive of opted-in soundtracks
  api/
    generate/route.ts                 Claude + Replicate kick-off + Supabase insert
    titles/route.ts                   Shuffle: three fresh titles
    archive/route.ts                  GET public soundtracks (JSON)
    soundtrack/[id]/route.ts          PATCH: selectedTitle / isPublic
    soundtrack/[id]/status/route.ts   GET: poll status, persist on success
lib/
  questions.ts                        the four questions + genre options
  claude.ts                           Anthropic client + prompt/title generation
  replicate.ts                        Replicate client + music + cover models
  supabase.ts                         Server-side Supabase client + bucket names
```

## What's next

1. Subdomain hygiene — confirm `soundtrack.irina.love` is fully live + SSL good
2. Player-side fade-in / fade-out on the audio (~30 lines, soft edges instead of abrupt)
3. OG image rendering using the generated cover (so shared links look beautiful)
4. Client-side MP4 generation for social sharing
5. Optional: SoundCloud OAuth + opt-in publish from the archive page

## Theme

CSS variables in `app/globals.css`. Five colors — tune to taste.

## Deploy

Push to GitHub → Vercel auto-deploys. Add four env vars in Vercel's Environment Variables UI: `REPLICATE_API_TOKEN`, `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SECRET_KEY`.

## SQL schema (for reference)

```sql
create table if not exists soundtracks (
  id text primary key,
  answers jsonb not null,
  music_prompt text not null,
  visual_prompt text,
  titles text[] not null default '{}',
  selected_title text,
  music_replicate_id text not null,
  cover_replicate_id text,
  music_url text,
  cover_url text,
  music_status text default 'starting',
  cover_status text default 'starting',
  is_public boolean default false,
  shared_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_soundtracks_public
  on soundtracks (is_public, shared_at desc nulls last)
  where is_public = true;

alter table soundtracks enable row level security;
drop policy if exists "no public access" on soundtracks;
create policy "no public access" on soundtracks for all using (false);
```
