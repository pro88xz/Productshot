import Replicate from 'replicate';

if (!process.env.REPLICATE_API_TOKEN) {
  throw new Error('Missing REPLICATE_API_TOKEN environment variable');
}

/**
 * Replicate API client — server-only.
 * Used for product photo generation via FLUX Kontext Pro.
 */
export const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});
