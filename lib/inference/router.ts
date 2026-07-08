import type {
  GenerationRequest,
  GenerationResult,
  ProviderName,
  RenderPath,
} from './types';
import { ReplicateProvider } from './providers/replicate';
import { ComposeProvider } from './providers/compose';
import { verifyWithKimi } from './verify/kimi';
import { getGemmaRoutingAdvice } from './intelligence/gemma-router';
import { getScene } from './scenes';
import { logRoutingEvent } from './telemetry';
import { createAdminClient } from '../supabase/admin';

export interface RoutingDecision {
  primaryProvider: ProviderName;
  path: RenderPath;
  reason: string;
  runVerification: boolean;
}

export interface RouterGenerateOptions {
  userId?: string | null;
  generationId?: string | null;
}

const isEnabled = () => process.env.ENABLE_SCAFFOLD_ROUTER === 'true';
const shouldVerify = () => process.env.ENABLE_VERIFICATION !== 'false';

/**
 * Per-scene routing:
 *   - Explicit request preferredPath  wins
 *   - Otherwise: SCENES[sceneId].preferredPath
 *   - Fallback: 'edit'
 */
export function decide(req: GenerationRequest): RoutingDecision {
  if (!isEnabled()) {
    return {
      primaryProvider: 'replicate',
      path: 'edit',
      reason: 'router disabled — edit path via Replicate (legacy behavior)',
      runVerification: false,
    };
  }

  const scene = getScene(req.sceneId);
  const path: RenderPath =
    req.preferredPath ?? scene?.preferredPath ?? 'edit';

  const reason = req.preferredPath
    ? `caller forced path="${path}"`
    : scene
      ? `scene "${req.sceneId}" default path is ${path}`
      : `unknown scene "${req.sceneId}", defaulting to edit`;

  return {
    primaryProvider: 'replicate',
    path,
    reason,
    runVerification: shouldVerify(),
  };
}

function resolvePrompt(req: GenerationRequest, path: RenderPath): string {
  if (req.prompt) return req.prompt;
  const scene = getScene(req.sceneId);
  if (!scene) {
    throw new Error(`No prompt provided and scene "${req.sceneId}" not in SCENES`);
  }
  return path === 'compose' ? scene.composeScenePrompt : scene.editPrompt;
}

/**
 * Kimi needs a public https URL to fetch the image. The compose path returns a
 * base64 data URI (efficient for local inline handling). Before verification,
 * we materialize the data URI to a temporary public URL by uploading it to
 * Supabase Storage. Called only on compose path — edit path already has a URL.
 */
async function materializeToUrl(dataUri: string, sceneId: string): Promise<string> {
  // Parse the data URI: data:image/jpeg;base64,<base64>
  const match = dataUri.match(/^data:(image\/[a-z]+);base64,(.+)$/);
  if (!match) {
    throw new Error(`materializeToUrl: not a valid data URI`);
  }
  const [, mime, b64] = match;
  const buffer = Buffer.from(b64, 'base64');

  // Upload to a scratch path in product-photos bucket
  const admin = createAdminClient();
  const path = `scaffold-scratch/${sceneId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;

  const { error: uploadErr } = await admin.storage
    .from('product-photos')
    .upload(path, buffer, { contentType: mime, upsert: true });

  if (uploadErr) {
    throw new Error(`materializeToUrl upload failed: ${uploadErr.message}`);
  }

  // Signed URL good for 5 minutes — Kimi will fetch within seconds
  const { data: signed, error: signErr } = await admin.storage
    .from('product-photos')
    .createSignedUrl(path, 60 * 5);

  if (signErr || !signed?.signedUrl) {
    throw new Error(
      `materializeToUrl signed URL failed: ${signErr?.message ?? 'no signedUrl'}`,
    );
  }

  return signed.signedUrl;
}

async function runOnePath(
  req: GenerationRequest,
  path: RenderPath,
  runVerification: boolean,
): Promise<GenerationResult> {
  const provider = path === 'compose' ? new ComposeProvider() : new ReplicateProvider();
  const raw = await provider.generate(req);
  const result: GenerationResult = { ...raw, path };

  if (runVerification) {
    try {
      // If compose gave us a data URI, materialize it to a public URL first
      // so Kimi can actually fetch the image.
      const generatedUrlForKimi = result.outputUrl.startsWith('data:')
        ? await materializeToUrl(result.outputUrl, req.sceneId)
        : result.outputUrl;

      const verification = await verifyWithKimi({
        sourceImageUrl: req.sourceImageUrl,
        generatedImageUrl: generatedUrlForKimi,
      });
      result.verification = verification;
    } catch (err) {
      console.warn(
        '[scaffold-router] verification failed (non-fatal):',
        err instanceof Error ? err.message : err,
      );
    }
  }
  return result;
}

/**
 * Score threshold below which the edit path is considered a failure and the
 * router retries with the compose path as fallback. Compose has guaranteed
 * product preservation by construction, so it's a safe fallback.
 */
const EDIT_MIN_VERIFY_SCORE = parseFloat(
  process.env.EDIT_MIN_VERIFY_SCORE ?? '0.85',
);

export async function generate(
  req: GenerationRequest,
  opts: RouterGenerateOptions = {},
): Promise<{
  result: GenerationResult;
  decision: RoutingDecision;
}> {
  const decision = decide(req);

  // Gemma routing intelligence — advisory layer on top of the static decision.
  // Only runs when the scaffold router itself is enabled; never runs in the
  // legacy disabled path. On any failure this returns a safe fallback that
  // matches the static decision, so it can never make routing worse.
  const scene = getScene(req.sceneId);
  const gemmaAdvice =
    process.env.ENABLE_SCAFFOLD_ROUTER === 'true'
      ? await getGemmaRoutingAdvice({
          sceneId: req.sceneId,
          sceneDisplayName: scene?.displayName ?? req.sceneId,
          scenePreferredPath: decision.path,
          productHint: req.prompt,
        })
      : undefined;

  if (gemmaAdvice && !gemmaAdvice.usedFallback && gemmaAdvice.recommendedPath !== decision.path) {
    decision.path = gemmaAdvice.recommendedPath;
    decision.reason = `${decision.reason} (Gemma override, confidence ${gemmaAdvice.confidence.toFixed(2)}: ${gemmaAdvice.reasoning})`;
  }

  const resolvedPrompt = resolvePrompt(req, decision.path);
  const enrichedReq: GenerationRequest = { ...req, prompt: resolvedPrompt };

  // Primary attempt
  let result = await runOnePath(enrichedReq, decision.path, decision.runVerification);

  // Verification-driven retry: if we went the edit path and Kimi says the
  // product identity drifted below threshold, retry on the compose path.
  // Compose guarantees preservation by construction. Best of both worlds.
  const shouldRetry =
    decision.path === 'edit' &&
    decision.runVerification &&
    result.verification !== undefined &&
    result.verification.score < EDIT_MIN_VERIFY_SCORE;

  if (shouldRetry) {
    console.log(
      `[scaffold-router] edit-path score ${result.verification!.score.toFixed(2)} < ${EDIT_MIN_VERIFY_SCORE}, retrying on compose path`,
    );

    // Only retry compose if the scene has a composeScenePrompt
    const composeReq: GenerationRequest = {
      ...enrichedReq,
      prompt: resolvePrompt(enrichedReq, 'compose'),
    };

    try {
      const retryResult = await runOnePath(composeReq, 'compose', true);
      // Preserve total cost/latency — retry adds to it, doesn't replace it
      retryResult.costUsd = result.costUsd + retryResult.costUsd;
      retryResult.latencyMs = result.latencyMs + retryResult.latencyMs;
      retryResult.wasFallback = true;

      // Log the original edit-path attempt so telemetry captures the fallback event
      void logRoutingEvent({
        userId: opts.userId ?? null,
        generationId: opts.generationId ?? null,
        sceneId: enrichedReq.sceneId,
        sourceImageUrl: enrichedReq.sourceImageUrl,
        decision,
        result, // the failed edit-path result
      });

      // Return the compose fallback as the winner
      result = retryResult;
      // Update decision to reflect what actually shipped
      decision.path = 'compose';
      decision.reason = `${decision.reason} (fallback: edit score ${result.verification?.score.toFixed(2)} < ${EDIT_MIN_VERIFY_SCORE})`;
    } catch (err) {
      console.warn(
        '[scaffold-router] compose fallback also failed, keeping edit result:',
        err instanceof Error ? err.message : err,
      );
    }
  }

  if (gemmaAdvice) {
    result.gemmaAdvice = gemmaAdvice;
  }

  // Fire-and-forget telemetry for the final result
  void logRoutingEvent({
    userId: opts.userId ?? null,
    generationId: opts.generationId ?? null,
    sceneId: enrichedReq.sceneId,
    sourceImageUrl: enrichedReq.sourceImageUrl,
    decision,
    result,
  });

  return { result, decision };
}