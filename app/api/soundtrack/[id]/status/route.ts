import { NextResponse, after } from 'next/server';
import { replicate } from '@/lib/replicate';
import { supabaseAdmin, AUDIO_BUCKET, COVERS_BUCKET } from '@/lib/supabase';

export const maxDuration = 30;

/**
 * GET /api/soundtrack/[id]/status
 *
 * Reads the soundtrack record from Supabase. If a Replicate prediction
 * hasn't yet succeeded, polls Replicate for the latest status. When a
 * prediction has just succeeded, persists the asset to Supabase Storage
 * in the background (via after()) so the response stays fast.
 *
 * Returns the full state the reveal page needs: status, audio URL, cover
 * URL, titles, answers, selected title, share flag.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!process.env.REPLICATE_API_TOKEN) {
    return NextResponse.json(
      { error: 'REPLICATE_API_TOKEN is not set' },
      { status: 500 }
    );
  }

  const { data: record, error: readError } = await supabaseAdmin
    .from('soundtracks')
    .select('*')
    .eq('id', id)
    .single();

  if (readError || !record) {
    return NextResponse.json(
      { error: 'soundtrack not found' },
      { status: 404 }
    );
  }

  // Track what we should persist after returning
  let pendingMusicPersist: string | null = null;
  let pendingCoverPersist: string | null = null;

  let musicStatus = record.music_status;
  let musicUrl: string | null = record.music_url;
  let coverStatus = record.cover_status;
  let coverUrl: string | null = record.cover_url;

  // ------ Music ----------------------------------------------------------
  if (musicStatus !== 'succeeded' && record.music_replicate_id) {
    try {
      const prediction = await replicate.predictions.get(
        record.music_replicate_id
      );
      musicStatus = prediction.status;

      if (prediction.status === 'succeeded') {
        const tempUrl = unwrapOutput(prediction.output);
        if (typeof tempUrl === 'string') {
          // Return Replicate URL immediately so playback can start
          musicUrl = musicUrl ?? tempUrl;
          // Queue persistence for after the response
          if (!record.music_url) {
            pendingMusicPersist = tempUrl;
          }
        }
      } else if (
        prediction.status === 'failed' ||
        prediction.status === 'canceled'
      ) {
        await supabaseAdmin
          .from('soundtracks')
          .update({ music_status: prediction.status })
          .eq('id', id);
      }
    } catch (err) {
      console.error('[status] music check error:', err);
    }
  }

  // ------ Cover ----------------------------------------------------------
  if (coverStatus !== 'succeeded' && record.cover_replicate_id) {
    try {
      const prediction = await replicate.predictions.get(
        record.cover_replicate_id
      );
      coverStatus = prediction.status;

      if (prediction.status === 'succeeded') {
        const tempUrl = unwrapOutput(prediction.output);
        if (typeof tempUrl === 'string') {
          coverUrl = coverUrl ?? tempUrl;
          if (!record.cover_url) {
            pendingCoverPersist = tempUrl;
          }
        }
      } else if (
        prediction.status === 'failed' ||
        prediction.status === 'canceled'
      ) {
        await supabaseAdmin
          .from('soundtracks')
          .update({ cover_status: prediction.status })
          .eq('id', id);
      }
    } catch (err) {
      console.error('[status] cover check error:', err);
    }
  }

  // Schedule background persistence — runs after we return the response
  if (pendingMusicPersist || pendingCoverPersist) {
    const musicSource = pendingMusicPersist;
    const coverSource = pendingCoverPersist;
    after(async () => {
      try {
        if (musicSource) {
          const persistedUrl = await persistAsset(
            musicSource,
            AUDIO_BUCKET,
            id,
            'mp3',
            'audio/mpeg'
          );
          if (persistedUrl) {
            await supabaseAdmin
              .from('soundtracks')
              .update({ music_url: persistedUrl, music_status: 'succeeded' })
              .eq('id', id);
          }
        }
        if (coverSource) {
          const persistedUrl = await persistAsset(
            coverSource,
            COVERS_BUCKET,
            id,
            'png',
            'image/png'
          );
          if (persistedUrl) {
            await supabaseAdmin
              .from('soundtracks')
              .update({ cover_url: persistedUrl, cover_status: 'succeeded' })
              .eq('id', id);
          }
        }
      } catch (err) {
        console.error('[status] background persist error:', err);
      }
    });
  }

  return NextResponse.json({
    // Backward-compatible fields used by the reveal page
    status: musicStatus,
    audioUrl: musicUrl,
    // New cover fields
    coverStatus,
    coverUrl,
    // Persisted data the reveal page renders
    titles: record.titles ?? [],
    selectedTitle: record.selected_title,
    answers: record.answers,
    isPublic: record.is_public,
    error: null,
  });
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function unwrapOutput(output: unknown): string | null {
  if (typeof output === 'string') return output;
  if (Array.isArray(output) && output.length > 0) {
    const first = output[0];
    if (typeof first === 'string') return first;
  }
  return null;
}

async function persistAsset(
  sourceUrl: string,
  bucket: string,
  soundtrackId: string,
  extension: string,
  contentType: string
): Promise<string | null> {
  try {
    const res = await fetch(sourceUrl);
    if (!res.ok) {
      console.error(
        `[persist] fetch from Replicate failed: ${res.status} ${res.statusText}`
      );
      return null;
    }
    const buffer = await res.arrayBuffer();
    const filePath = `${soundtrackId}.${extension}`;

    const { error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(filePath, buffer, { contentType, upsert: true });

    if (error) {
      console.error('[persist] supabase upload failed:', error);
      return null;
    }

    const { data } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(filePath);
    return data.publicUrl;
  } catch (err) {
    console.error('[persist] error:', err);
    return null;
  }
}
