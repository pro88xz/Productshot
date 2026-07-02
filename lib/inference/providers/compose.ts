import sharp from 'sharp';
import type {
  InferenceProvider,
  GenerationRequest,
  GenerationResult,
  ModelTier,
} from '../types';
import { MODEL_COSTS } from '../types';
import { replicate } from '../../replicate/client';
import { extractUrl } from './replicate';
import { getScene } from '../scenes';

/**
 * Compose provider: the cost-saving path.
 *
 *   1. rembg (Replicate) removes background from source product photo -> transparent PNG
 *   2. FLUX Schnell (Replicate) generates the empty scene backdrop -> JPG
 *   3. sharp composites product PNG over scene JPG -> final JPG buffer
 *
 * Total per image: ~$0.004 vs edit path's $0.04 (10x cheaper).
 * Product preservation: GUARANTEED — final image contains the literal
 * source pixels, cutout and repositioned. Only the backdrop is AI-generated.
 *
 * Returns a data URI for the composite so verification (Kimi) can consume it
 * without needing a public URL. Production wiring in /api/generate will
 * upload to Supabase Storage instead.
 */

// Well-established rembg model on Replicate — outputs a transparent PNG
// Community model — SDK requires a version hash. We resolve it lazily and cache.
const REMBG_OWNER = '851-labs';
const REMBG_NAME = 'background-remover';
let cachedRembgVersion: string | null = null;

async function resolveRembgVersion(): Promise<string> {
  if (cachedRembgVersion) return cachedRembgVersion;
  const model = await replicate.models.get(REMBG_OWNER, REMBG_NAME);
  const versionId = model?.latest_version?.id;
  if (!versionId) {
    throw new Error(`No latest_version for ${REMBG_OWNER}/${REMBG_NAME}`);
  }
  cachedRembgVersion = versionId;
  return versionId;
}

// FLUX Schnell on Replicate — 4-step distilled, ~3s, cheap
const FLUX_SCHNELL_MODEL = 'black-forest-labs/flux-schnell';

async function fetchAsBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${url} failed: ${res.status}`);
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}



/** Retry a Replicate call on 429 rate-limit responses, respecting retry_after. */
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

      // Extract retry_after from the error body if present, otherwise back off
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

async function removeBackground(sourceImageUrl: string): Promise<{ png: Buffer; ms: number }> {
  const started = Date.now();
  const raw = await withRateLimitRetry(
    async () => {
      const version = await resolveRembgVersion();
      return replicate.run(
        `${REMBG_OWNER}/${REMBG_NAME}:${version}` as `${string}/${string}:${string}`,
        { input: { image: sourceImageUrl } },
      );
    },
    'rembg',
  );
  const url = extractUrl(raw);
  if (!url) {
    throw new Error(
      `rembg returned no URL. Got: ${JSON.stringify(raw).slice(0, 200)}`,
    );
  }
  const png = await fetchAsBuffer(url);
  return { png, ms: Date.now() - started };
}

async function generateSceneBackdrop(
  scenePrompt: string,
): Promise<{ jpg: Buffer; ms: number }> {
  const started = Date.now();
  const raw = await withRateLimitRetry(
    () =>
      replicate.run(FLUX_SCHNELL_MODEL, {
        input: {
          prompt: scenePrompt,
          aspect_ratio: '1:1',
          output_format: 'jpg',
          output_quality: 92,
          num_outputs: 1,
          num_inference_steps: 4,
        },
      }),
    'flux-schnell',
  );
  const url = extractUrl(raw);
  if (!url) {
    throw new Error(
      `flux-schnell returned no URL. Got: ${JSON.stringify(raw).slice(0, 200)}`,
    );
  }
  const jpg = await fetchAsBuffer(url);
  return { jpg, ms: Date.now() - started };
}

async function compositeProductOnScene(
  productPng: Buffer,
  scene: Buffer,
): Promise<{ jpg: Buffer; ms: number }> {
  const started = Date.now();

  // Get scene dimensions
  const sceneMeta = await sharp(scene).metadata();
  const sceneW = sceneMeta.width ?? 1024;
  const sceneH = sceneMeta.height ?? 1024;

  // Resize product cutout to ~65% of scene height, preserving aspect
  const targetH = Math.floor(sceneH * 0.65);
  const productResized = await sharp(productPng)
    .resize({ height: targetH, fit: 'inside', withoutEnlargement: false })
    .png()
    .toBuffer();

  const productMeta = await sharp(productResized).metadata();
  const productW = productMeta.width ?? targetH;
  const productH = productMeta.height ?? targetH;

  // Position: horizontally centered, vertically ~55% down (leaves room for shadow)
  const left = Math.max(0, Math.floor((sceneW - productW) / 2));
  const top = Math.max(0, Math.floor((sceneH - productH) * 0.55));

  const jpg = await sharp(scene)
    .composite([{ input: productResized, left, top }])
    .jpeg({ quality: 90 })
    .toBuffer();

  return { jpg, ms: Date.now() - started };
}

function bufferToDataUri(buf: Buffer, mime = 'image/jpeg'): string {
  return `data:${mime};base64,${buf.toString('base64')}`;
}

export class ComposeProvider implements InferenceProvider {
  readonly name = 'replicate' as const;

  async generate(
    req: GenerationRequest,
  ): Promise<Omit<GenerationResult, 'path' | 'verification'>> {
    const tier: ModelTier = 'compose-hybrid';
    const started = Date.now();

    const scene = getScene(req.sceneId);
    const scenePrompt = scene?.composeScenePrompt;
    if (!scenePrompt) {
      throw new Error(
        `Compose path requires a compose scene prompt for scene "${req.sceneId}"`,
      );
    }

    // Step 1 + 2 sequentially — Replicate's low-credit tier has burst=1.
    // Once account is topped up above $5, this can go back to Promise.all.
    const rembgOut = await removeBackground(req.sourceImageUrl);
    const sceneOut = await generateSceneBackdrop(scenePrompt);

    // Step 3 — composite (sequential, needs both above)
    const composite = await compositeProductOnScene(rembgOut.png, sceneOut.jpg);

    const rembgCost = 0.001;
    const sceneGenCost = 0.003;

    return {
      outputUrl: bufferToDataUri(composite.jpg, 'image/jpeg'),
      provider: 'replicate',
      tier,
      costUsd: MODEL_COSTS.replicate[tier] ?? rembgCost + sceneGenCost,
      latencyMs: Date.now() - started,
      wasFallback: false,
      composeBreakdown: {
        rembgMs: rembgOut.ms,
        sceneGenMs: sceneOut.ms,
        compositeMs: composite.ms,
        rembgCostUsd: rembgCost,
        sceneGenCostUsd: sceneGenCost,
      },
    };
  }
}
