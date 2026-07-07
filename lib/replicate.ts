import Replicate from 'replicate';

/**
 * Single Replicate client used by all API routes.
 * Reads REPLICATE_API_TOKEN from the environment.
 */
export const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// ---------------------------------------------------------------------------
// Music model — MusicGen stereo-large at 30 seconds
//
// Replicate's meta/musicgen only exposes the large variants (no medium/small).
// So our only levers for speed are: (1) duration, (2) mono vs stereo, or
// (3) switching to a different model entirely (e.g. stable-audio-open).
//
// Current settings prioritise quality: keep stereo-large, but shorten duration
// from 60s → 30s, which halves generation time. Roughly 90–120s per soundtrack
// warm, ~180s cold-start.
//
// If speed still isn't enough:
//   - Drop model_version to 'large' (mono) — slightly faster
//   - Drop duration to 20 — nearly instant but very short piece
//   - Switch MUSIC_MODEL to 'stackadoc/stable-audio-open-1.0' — 15–30s per gen
// ---------------------------------------------------------------------------

export const MUSIC_MODEL = 'meta/musicgen';

export const MUSIC_INPUT_DEFAULTS = {
  model_version: 'stereo-large' as const,
  duration: 30,
  output_format: 'mp3' as const,
  normalization_strategy: 'loudness' as const,
};

// ---------------------------------------------------------------------------
// Cover model — Flux Dev for photographic/cinematic album covers
// ---------------------------------------------------------------------------

export const COVER_MODEL = 'black-forest-labs/flux-dev';

export const COVER_INPUT_DEFAULTS = {
  aspect_ratio: '1:1' as const,
  output_format: 'png' as const,
  num_outputs: 1,
  num_inference_steps: 28,
  guidance: 3.5,
};

// ---------------------------------------------------------------------------
// Version resolution
//
// Replicate's API requires a specific version hash for community models.
// We resolve the latest version dynamically with an in-memory cache.
// ---------------------------------------------------------------------------

type CacheEntry = { id: string; cachedAt: number };
const VERSION_TTL_MS = 60 * 60 * 1000; // 1 hour
const versionCache = new Map<string, CacheEntry>();

async function getLatestVersion(modelName: string): Promise<string> {
  const now = Date.now();
  const cached = versionCache.get(modelName);
  if (cached && now - cached.cachedAt < VERSION_TTL_MS) {
    return cached.id;
  }

  const [owner, name] = modelName.split('/');
  const model = await replicate.models.get(owner, name);
  const versionId = model.latest_version?.id;
  if (!versionId) {
    throw new Error(
      `Could not find a latest version for ${modelName} on Replicate.`
    );
  }

  versionCache.set(modelName, { id: versionId, cachedAt: now });
  return versionId;
}

export const getLatestMusicVersion = () => getLatestVersion(MUSIC_MODEL);
export const getLatestCoverVersion = () => getLatestVersion(COVER_MODEL);
