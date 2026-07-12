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
  let pendingExtensionPersist: string | null = null;

  let musicStatus = record.music_status;
  let musicUrl: string | null = record.music_url;
  let coverStatus = record.cover_status;
  let coverUrl: string | null = record.cover_url;
  let extensionStatus: string = record.extension_status ?? 'idle';
  let musicUrls: string[] = Array.isArray(record.music_urls)
    ? record.music_urls
    : record.music_url
      ? [record.music_url]
      : [];
  let musicDuration: number = record.music_duration ?? 30;

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

  // ------ Extension -----------------------------------------------------
  // "Keep it going" extensions poll here alongside music + cover. When the
  // continuation prediction succeeds we return the temp Replicate URL
  // immediately so the client can start playing it, then persist to
  // Supabase Storage in the background (same pattern as music/cover).
  if (
    record.extension_replicate_id &&
    extensionStatus !== 'succeeded' &&
    extensionStatus !== 'failed' &&
    extensionStatus !== 'canceled'
  ) {
    try {
      const prediction = await replicate.predictions.get(
        record.extension_replicate_id
      );
      extensionStatus = prediction.status;

      if (prediction.status === 'succeeded') {
        const tempUrl = unwrapOutput(prediction.output);
        if (typeof tempUrl === 'string') {
          // Return the extended URL immediately so the client can start
          // sequential playback; persistence happens in the background.
          musicUrls = [...musicUrls, tempUrl];
          musicDuration = musicDuration + 30;
          pendingExtensionPersist = tempUrl;
        }
      } else if (
        prediction.status === 'failed' ||
        prediction.status === 'canceled'
      ) {
        await supabaseAdmin
          .from('soundtracks')
          .update({
            extension_status: prediction.status,
            extension_replicate_id: null,
          })
          .eq('id', id);
      }
    } catch (err) {
      console.error('[status] extension check error:', err);
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
  if (
    pendingMusicPersist ||
    pendingCoverPersist ||
    pendingExtensionPersist
  ) {
    const musicSource = pendingMusicPersist;
    const coverSource = pendingCoverPersist;
    const extensionSource = pendingExtensionPersist;
    // Snapshot the final urls array + duration for the update below so we
    // don't race with any newer state that might be written in parallel.
    const finalMusicUrls = musicUrls;
    const finalMusicDuration = musicDuration;
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
            // The original track is both music_url (backwards-compat) and
            // the first entry in music_urls (sequential playback).
            const newMusicUrls =
              finalMusicUrls.length > 0
                ? [persistedUrl, ...finalMusicUrls.slice(1)]
                : [persistedUrl];
            await supabaseAdmin
              .from('soundtracks')
              .update({
                music_url: persistedUrl,
                music_urls: newMusicUrls,
                music_status: 'succeeded',
              })
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
        if (extensionSource) {
          // Re-fetch the current row so we don't clobber other segments
          // that may have been persisted since we captured state above.
          const { data: fresh } = await supabaseAdmin
            .from('soundtracks')
            .select('music_urls, music_duration')
            .eq('id', id)
            .single();
          const existingUrls: string[] = Array.isArray(fresh?.music_urls)
            ? fresh!.music_urls
            : [];
          // Segment index is 1-based (0 = original). Filename encodes it
          // so we don't collide when a user extends the same track twice.
          const segmentIndex = Math.max(
            1,
            (fresh?.music_duration ?? finalMusicDuration) / 30 - 1
          );
          const persistedUrl = await persistAsset(
            extensionSource,
            AUDIO_BUCKET,
            `${id}-ext-${segmentIndex}`,
            'mp3',
            'audio/mpeg'
          );
          if (persistedUrl) {
            // Replace the temp URL (last entry, since we appended it in
            // the extension check above) with the persisted one.
            const withoutTemp =
              existingUrls.length > 0
                ? existingUrls.filter((u) => u !== extensionSource)
                : [];
            const nextUrls = [...withoutTemp, persistedUrl];
            await supabaseAdmin
              .from('soundtracks')
              .update({
                music_urls: nextUrls,
                music_duration: nextUrls.length * 30,
                extension_status: 'succeeded',
                extension_replicate_id: null,
              })
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
    // Cover
    coverStatus,
    coverUrl,
    // Extension — full ordered URL list for sequential playback plus the
    // current total duration and pending-extension status so the client can
    // decide whether to show "Keep it going" as ready / extending / capped.
    musicUrls,
    musicDuration,
    extensionStatus,
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
