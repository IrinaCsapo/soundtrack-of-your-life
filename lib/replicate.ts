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
