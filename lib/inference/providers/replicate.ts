import type {
  InferenceProvider,
  GenerationRequest,
  GenerationResult,
  ModelTier,
} from '../types';
import { MODEL_COSTS } from '../types';
import { replicate } from '../../replicate/client';

const REPLICATE_MODEL_ID = 'black-forest-labs/flux-kontext-pro';

/** Replicate SDK now returns URL instances, arrays of URLs, strings, or objects with .url(). */
export function extractUrl(output: unknown): string | null {
  if (!output) return null;
  if (typeof output === 'string') return output;
  if (output instanceof URL) return output.href;
  if (Array.isArray(output)) {
    for (const item of output) {
      const url = extractUrl(item);
      if (url) return url;
    }
    return null;
  }
  if (typeof output === 'object') {
    // Some replicate outputs expose { url: () => string } or { href: string }
    if ('href' in output && typeof (output as { href: unknown }).href === 'string') {
      return (output as { href: string }).href;
    }
    if ('url' in output) {
      const maybeUrl = (output as { url: unknown }).url;
      if (typeof maybeUrl === 'string') return maybeUrl;
      if (typeof maybeUrl === 'function') {
        try {
          const called = (maybeUrl as () => unknown)();
          return extractUrl(called);
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}



/** Retry Replicate calls on 429 rate-limit responses, respecting retry_after. */
async function withRateLimitRetry<T>(
  op: () => Promise<T>,
  label: string,
  maxAttempts = 5,
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await op();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const is429 = msg.includes('429') || msg.toLowerCase().includes('throttled');
      if (!is429 || attempt === maxAttempts) throw err;
      const retryMatch = msg.match(/"retry_after":\s*(\d+)/);
      const waitSec = retryMatch ? parseInt(retryMatch[1], 10) + 1 : 5 * attempt;
      console.log(
        `  [${label}] rate-limited (attempt ${attempt}/${maxAttempts}), waiting ${waitSec}s...`,
      );
      await new Promise((r) => setTimeout(r, waitSec * 1000));
    }
  }
  throw new Error(`${label}: exhausted retries`);
}

export class ReplicateProvider implements InferenceProvider {
  readonly name = 'replicate' as const;

  async generate(
    req: GenerationRequest,
  ): Promise<Omit<GenerationResult, 'path' | 'verification'>> {
    const tier: ModelTier = 'kontext-pro';
    const started = Date.now();

    const output = await withRateLimitRetry(
      () =>
        replicate.run(REPLICATE_MODEL_ID, {
          input: {
            prompt: req.prompt,
            input_image: req.sourceImageUrl,
            output_format: 'jpg',
            safety_tolerance: 2,
          },
        }),
      'flux-kontext-pro',
    );

    const outputUrl = extractUrl(output);
    if (!outputUrl) {
      throw new Error(
        `Replicate returned no usable URL for ${req.sceneId}. Got: ${JSON.stringify(output).slice(0, 200)}`,
      );
    }

    return {
      outputUrl,
      provider: 'replicate',
      tier,
      costUsd: MODEL_COSTS.replicate[tier] ?? 0.04,
      latencyMs: Date.now() - started,
      wasFallback: false,
    };
  }
}
