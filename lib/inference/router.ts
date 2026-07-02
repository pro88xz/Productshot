import type {
  GenerationRequest,
  GenerationResult,
  ProviderName,
  RenderPath,
} from './types';
import { ReplicateProvider } from './providers/replicate';
import { ComposeProvider } from './providers/compose';
import { verifyWithKimi } from './verify/kimi';
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

export async function generate(req: GenerationRequest): Promise<{
  result: GenerationResult;
  decision: RoutingDecision;
}> {
  const decision = decide(req);
  const resolvedPrompt = resolvePrompt(req, decision.path);
  const enrichedReq: GenerationRequest = { ...req, prompt: resolvedPrompt };

  const provider =
    decision.path === 'compose' ? new ComposeProvider() : new ReplicateProvider();

  const raw = await provider.generate(enrichedReq);
  const result: GenerationResult = { ...raw, path: decision.path };

  if (decision.runVerification) {
    try {
      const verification = await verifyWithKimi({
        sourceImageUrl: enrichedReq.sourceImageUrl,
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

  return { result, decision };
}
