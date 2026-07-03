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
import type { CompositeConfig } from '../scenes';
import { createAdminClient } from '../../supabase/admin';

/**
 * Compose provider — the cost-saving path.
 *
 * Steps:
 *   1. rembg (Replicate) removes background from source → transparent PNG
 *   2. FLUX Schnell (Replicate) generates the empty scene backdrop → JPG
 *   3. Product cutout is tone-matched to the scene (brightness/warmth/saturation)
 *   4. A soft drop shadow is rendered beneath the product per scene direction
 *   5. Final composite: [scene] + [shadow] + [tone-matched product]
 *
 * Total per image: ~$0.005 vs edit path's $0.04.
 * Product preservation: GUARANTEED (source pixels, cutout, re-toned but structure intact).
 */

const REMBG_OWNER = 'lucataco';
const REMBG_NAME = 'remove-bg';
let cachedRembgVersion: string | null = null;

const FLUX_SCHNELL_MODEL = 'black-forest-labs/flux-schnell';

// --- Replicate helpers ---

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

async function fetchAsBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${url} failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
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
  if (!url) throw new Error(`rembg returned no URL. Got: ${JSON.stringify(raw).slice(0, 200)}`);
  return { png: await fetchAsBuffer(url), ms: Date.now() - started };
}


/**
 * Pick a random pre-generated backdrop from Supabase.
 * Returns null if none exist for the scene — caller falls back to on-the-fly generation.
 */
async function pickPregeneratedBackdrop(
  sceneId: string,
): Promise<{ jpg: Buffer; ms: number } | null> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('scaffold_backdrops')
      .select('storage_path')
      .eq('scene_id', sceneId);

    if (error) {
      console.log(`  [compose] backdrop query error: ${error.message}`);
      return null;
    }
    if (!data || data.length === 0) {
      console.log(`  [compose] backdrop query returned 0 rows for scene "${sceneId}"`);
      return null;
    }

    const started = Date.now();
    const pick = data[Math.floor(Math.random() * data.length)] as { storage_path: string };

    // product-photos bucket is private — must use a signed URL
    const { data: signed, error: signErr } = await admin.storage
      .from('product-photos')
      .createSignedUrl(pick.storage_path, 60 * 5); // 5 min is plenty for one fetch
    if (signErr || !signed?.signedUrl) {
      console.log(`  [compose] signed URL failed: ${signErr?.message ?? 'no signedUrl'}`);
      return null;
    }

    const jpg = await fetchAsBuffer(signed.signedUrl);
    return { jpg, ms: Date.now() - started };
  } catch (err) {
    console.log(`  [compose] backdrop lookup threw: ${err instanceof Error ? err.message : err}`);
    return null;
  }
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
  if (!url)
    throw new Error(`flux-schnell returned no URL. Got: ${JSON.stringify(raw).slice(0, 200)}`);
  return { jpg: await fetchAsBuffer(url), ms: Date.now() - started };
}

// --- Sharp helpers ---

/**
 * Trim transparent padding around a cutout so we know its true bounds.
 * rembg outputs often have huge transparent margins from the source aspect ratio.
 */
async function trimTransparent(productPng: Buffer): Promise<Buffer> {
  return sharp(productPng).trim({ threshold: 20, background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
}

/**
 * Tone-match the product cutout to the target scene.
 * Applies: brightness multiplier, saturation shift, and warmth (hue rotation
 * approximated via a subtle overlay). Cheap approximation, real impact.
 */
async function toneMatchProduct(
  productPng: Buffer,
  cfg: CompositeConfig,
): Promise<Buffer> {
  // sharp .modulate does brightness + saturation + hue rotation
  // We convert warmth [-0.15, 0.15] to a small hue rotation in degrees:
  //   positive warmth = shift toward orange (hue -15 to 0 = warmer)
  //   negative warmth = shift toward blue  (hue 0 to +15 = cooler)
  const hueShift = -cfg.toneWarmth * 40; // degrees

  return sharp(productPng)
    .modulate({
      brightness: cfg.toneBrightness,
      saturation: cfg.toneSaturation,
      hue: Math.round(hueShift),
    })
    .png()
    .toBuffer();
}

/**
 * Render a soft shadow buffer sized to the product cutout.
 * Shadow is the alpha channel of the product, filled black, gaussian-blurred,
 * with opacity applied.
 */
async function renderShadow(
  productPng: Buffer,
  cfg: CompositeConfig,
): Promise<{ shadow: Buffer; width: number; height: number }> {
  // Extract alpha, threshold to solid, tint black, blur, apply opacity
  const productMeta = await sharp(productPng).metadata();
  const w = productMeta.width ?? 512;
  const h = productMeta.height ?? 512;

  // Build shadow from the product's alpha channel directly.
  // Extract alpha, use it as a mask for a black RGBA image, blur, apply opacity.
  const alphaBuffer = await sharp(productPng)
    .ensureAlpha()
    .extractChannel('alpha')
    .raw()
    .toBuffer();

  const shadow = await sharp(alphaBuffer, {
    raw: { width: w, height: h, channels: 1 },
  })
    // Threshold: only pixels with strong alpha cast a shadow (kills rembg halos)
    .threshold(80)
    // Join the mask with a black RGB and modulated alpha
    .joinChannel(
      await sharp({
        create: {
          width: w,
          height: h,
          channels: 3,
          background: { r: 0, g: 0, b: 0 },
        },
      })
        .raw()
        .toBuffer(),
      { raw: { width: w, height: h, channels: 3 } },
    )
    .blur(cfg.shadowBlurSigma)
    .png()
    .toBuffer();

  // Apply opacity as a final pass — multiply alpha channel
  const shadowWithOpacity = await sharp(shadow)
    .composite([
      {
        input: Buffer.from([255, 255, 255, Math.round(cfg.shadowOpacity * 255)]),
        raw: { width: 1, height: 1, channels: 4 },
        tile: true,
        blend: 'dest-in',
      },
    ])
    .png()
    .toBuffer();

  return { shadow: shadowWithOpacity, width: w, height: h };
}

interface Placement {
  productLeft: number;
  productTop: number;
  productWidth: number;
  productHeight: number;
  shadowLeft: number;
  shadowTop: number;
}

/**
 * Compute where the product AND its shadow land in the scene.
 * Shadow offset depends on direction — below, below-left, etc.
 */
function computePlacement(
  sceneW: number,
  sceneH: number,
  productW: number,
  productH: number,
  cfg: CompositeConfig,
): Placement {
  const productLeft = Math.floor(sceneW * cfg.horizontalAnchor - productW / 2);
  const productTop = Math.floor(sceneH * cfg.verticalAnchor - productH / 2);

  // Shadow offset from product bottom, based on direction
  const shadowOffsetY = Math.floor(productH * 0.08); // baseline
  let shadowOffsetX = 0;

  switch (cfg.shadowDirection) {
    case 'below':
      shadowOffsetX = 0;
      break;
    case 'below-left':
      shadowOffsetX = -Math.floor(productW * 0.12);
      break;
    case 'below-right':
      shadowOffsetX = Math.floor(productW * 0.12);
      break;
    case 'beneath-flat':
      // Directly under product, no offset — top-down view
      shadowOffsetX = 0;
      break;
  }

  return {
    productLeft: Math.max(0, productLeft),
    productTop: Math.max(0, productTop),
    productWidth: productW,
    productHeight: productH,
    shadowLeft: Math.max(0, productLeft + shadowOffsetX),
    shadowTop: Math.max(0, productTop + shadowOffsetY),
  };
}

/** Final composite step: scene + shadow + tone-matched product → JPG. */
async function compositeProductOnScene(
  productPng: Buffer,
  scene: Buffer,
  cfg: CompositeConfig,
): Promise<{ jpg: Buffer; ms: number }> {
  const started = Date.now();

  // Trim the product so we know its real bounds
  const trimmed = await trimTransparent(productPng);

  // DEBUG DUMPS — see each intermediate stage
  const sceneMeta = await sharp(scene).metadata();
  const sceneW = sceneMeta.width ?? 1024;
  const sceneH = sceneMeta.height ?? 1024;

  // Resize product to target height
  const targetH = Math.floor(sceneH * cfg.heightRatio);
  const productResized = await sharp(trimmed)
    .resize({ height: targetH, fit: 'inside', withoutEnlargement: false })
    .png()
    .toBuffer();

  const productMeta = await sharp(productResized).metadata();
  const productW = productMeta.width ?? targetH;
  const productH = productMeta.height ?? targetH;

  // Tone-match product to scene lighting
  const productToned = await toneMatchProduct(productResized, cfg);

  // Render shadow at product size
  const { shadow } = await renderShadow(productResized, cfg);

  // Compute layered placement
  const p = computePlacement(sceneW, sceneH, productW, productH, cfg);

  // Layer: scene bg -> product (shadow disabled — pure product on backdrop looks cleaner)
  // TODO(day4): revisit shadow rendering with a proper alpha-mask approach
  void shadow; // silence unused var
  const jpg = await sharp(scene)
    .composite([
      { input: productToned, left: p.productLeft, top: p.productTop },
    ])
    .jpeg({ quality: 90 })
    .toBuffer();

  return { jpg, ms: Date.now() - started };
}

function bufferToDataUri(buf: Buffer, mime = 'image/jpeg'): string {
  return `data:${mime};base64,${buf.toString('base64')}`;
}

/** Default fallback config when a scene lacks one — safe centered placement. */
const DEFAULT_COMPOSITE: CompositeConfig = {
  heightRatio: 0.55,
  verticalAnchor: 0.58,
  horizontalAnchor: 0.5,
  shadowDirection: 'below',
  shadowBlurSigma: 18,
  shadowOpacity: 0.25,
  toneWarmth: 0,
  toneBrightness: 1.0,
  toneSaturation: 1.0,
};

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

    const compositeCfg = scene.composite ?? DEFAULT_COMPOSITE;

    // Try pre-generated backdrops first — free, instant, curated quality
    // Falls back to on-the-fly FLUX Schnell if backdrops missing (dev, new scenes)
    let sceneOut = await pickPregeneratedBackdrop(req.sceneId);
    let usedPregeneratedBackdrop = false;
    if (sceneOut) {
      usedPregeneratedBackdrop = true;
      console.log(`  [compose] using PRE-GENERATED backdrop for ${req.sceneId} (${sceneOut.ms}ms fetch)`);
    } else {
      console.log(`  [compose] no backdrop found for ${req.sceneId}, falling back to FLUX Schnell`);
      sceneOut = await generateSceneBackdrop(scenePrompt);
    }

    const rembgOut = await removeBackground(req.sourceImageUrl);
    const composite = await compositeProductOnScene(rembgOut.png, sceneOut.jpg, compositeCfg);

    const rembgCost = 0.001;
    const sceneGenCost = usedPregeneratedBackdrop ? 0 : 0.003;
    const totalCost = rembgCost + sceneGenCost;

    return {
      outputUrl: bufferToDataUri(composite.jpg, 'image/jpeg'),
      provider: 'replicate',
      tier,
      costUsd: totalCost,
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
