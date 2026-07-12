import { createClient } from '@supabase/supabase-js';

/**
 * Server-side Supabase client using the SECRET key.
 * Bypasses Row Level Security. Use ONLY in API routes / server components.
 * Never expose this to the browser.
 */
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  process.env.SUPABASE_SECRET_KEY ?? '',
  {
    auth: { persistSession: false, autoRefreshToken: false },
  }
);

export const AUDIO_BUCKET = 'audio';
export const COVERS_BUCKET = 'covers';

export type SoundtrackRow = {
  id: string;
  answers: Record<string, string>;
  music_prompt: string;
  visual_prompt: string | null;
  titles: string[];
  selected_title: string | null;
  music_replicate_id: string;
  cover_replicate_id: string | null;
  music_url: string | null;
  cover_url: string | null;
  music_status: string;
  cover_status: string;
  is_public: boolean;
  shared_at: string | null;
  created_at: string;

  // Extension feature — "Keep it going" appends 30s continuation segments
  // to music_urls up to 120s total. music_url stays the original for
  // backwards compat; music_urls holds the full ordered playback list.
  music_urls: string[];
  music_duration: number;
  extension_replicate_id: string | null;
  extension_status: string;
};
