-- Extension feature: "Keep it going" button lets users extend tracks they
-- love by 30 seconds at a time, up to 120 seconds total, using MusicGen's
-- continuation feature. Each extension appends a new URL to music_urls.

ALTER TABLE soundtracks
  ADD COLUMN IF NOT EXISTS music_urls text[] DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS music_duration int DEFAULT 30,
  ADD COLUMN IF NOT EXISTS extension_replicate_id text,
  ADD COLUMN IF NOT EXISTS extension_status text DEFAULT 'idle';

-- Backfill music_urls for existing rows so the sequential-playback client
-- always has at least one URL to play. If a row already has an extension
-- history somehow, don't clobber it.
UPDATE soundtracks
  SET music_urls = ARRAY[music_url]
  WHERE music_url IS NOT NULL
    AND (music_urls IS NULL OR array_length(music_urls, 1) IS NULL);
