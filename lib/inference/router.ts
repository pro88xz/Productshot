import type {
  GenerationRequest,
  GenerationResult,
  ProviderName,
  RenderPath,
} from './types';
import { ReplicateProvider } from './providers/replicate';
import { ComposeProvider } from './providers/compose';
import { verifyWithKimi } from './verify/kimi';
import { logRoutingEvent } from './telemetry';
import { getScene } from './scenes';

export interface RoutingDecision {
  primaryProvider: ProviderName;
  path: RenderPath;
  reason: string;
  runVerification: boolean;
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

export interface RouterGenerateOptions {
  userId?: string | null;
  generationId?: string | null;
}

/**
 * Score threshold below which the edit path is considered a failure and the
 * router retries with the compose path as fallback. Compose has guaranteed
 * product preservation by construction, so it's a safe fallback.
 */
const EDIT_MIN_VERIFY_SCORE = parseFloat(
  process.env.EDIT_MIN_VERIFY_SCORE ?? '0.85',
);

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
      const verification = await verifyWithKimi({
        sourceImageUrl: req.sourceImageUrl,
        generatedImageUrl: result.outputUrl,
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

export async function generate(
  req: GenerationRequest,
  opts: RouterGenerateOptions = {},
): Promise<{
  result: GenerationResult;
  decision: RoutingDecision;
}> {
  const decision = decide(req);
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
