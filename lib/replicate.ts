import Replicate from 'replicate';

/**
 * Single Replicate client used by all API routes.
 * Reads REPLICATE_API_TOKEN from the environment.
 */
export const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

/** Current music model + the defaults we send with every generation. */
export const MUSIC_MODEL = 'meta/musicgen';

export const MUSIC_INPUT_DEFAULTS = {
  model_version: 'stereo-large' as const,
  duration: 30,
  output_format: 'mp3' as const,
  normalization_strategy: 'loudness' as const,
};

/**
 * Fetch the latest version hash for the music model.
 *
 * Why this exists: as of mid-2026, Replicate's API for community-published
 * models requires a specific version hash rather than just `owner/name`.
 * We resolve the latest version on the fly so we don't have to hard-code
 * a hash that goes stale.
 *
 * The fetched version is cached in memory for the lifetime of the Vercel
 * function instance (small win on warm starts, no-op on cold starts).
 */
let cachedVersionId: string | null = null;
let cachedAt = 0;
const VERSION_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function getLatestMusicVersion(): Promise<string> {
  const now = Date.now();
  if (cachedVersionId && now - cachedAt < VERSION_CACHE_TTL_MS) {
    return cachedVersionId;
  }

  const [owner, name] = MUSIC_MODEL.split('/');
  const model = await replicate.models.get(owner, name);
  const versionId = model.latest_version?.id;

  if (!versionId) {
    throw new Error(
      `Could not find a latest version for ${MUSIC_MODEL} on Replicate. ` +
        `The model may have been moved or renamed.`
    );
  }

  cachedVersionId = versionId;
  cachedAt = now;
  return versionId;
}
