import type {
  GenerationRequest,
  GenerationResult,
  ProviderName,
  RenderPath,
} from './types';
import { ReplicateProvider } from './providers/replicate';
import { verifyWithKimi } from './verify/kimi';

export interface RoutingDecision {
  primaryProvider: ProviderName;
  path: RenderPath;
  reason: string;
  runVerification: boolean;
}

const isEnabled = () => process.env.ENABLE_SCAFFOLD_ROUTER === 'true';
const shouldVerify = () => process.env.ENABLE_VERIFICATION !== 'false';

/**
 * Day 1: single path (Replicate edit) + optional verification.
 * Day 2 will add the compose path with per-scene routing.
 */
export function decide(req: GenerationRequest): RoutingDecision {
  return {
    primaryProvider: 'replicate',
    path: req.preferredPath ?? 'edit',
    reason: 'day-1 edit path via replicate',
    runVerification: isEnabled() && shouldVerify(),
  };
}

export async function generate(req: GenerationRequest): Promise<{
  result: GenerationResult;
  decision: RoutingDecision;
}> {
  const decision = decide(req);

  const provider = new ReplicateProvider();
  const raw = await provider.generate(req);

  const result: GenerationResult = {
    ...raw,
    path: decision.path,
  };

  if (decision.runVerification) {
    try {
      const verification = await verifyWithKimi({
        sourceImageUrl: req.sourceImageUrl,
        generatedImageUrl: result.outputUrl,
      });
      result.verification = verification;
    } catch (verifyErr) {
      // Non-fatal — the generation itself succeeded.
      // Router logs this for the demo dashboard but doesn't fail the request.
      console.warn(
        '[scaffold-router] verification failed (non-fatal):',
        verifyErr instanceof Error ? verifyErr.message : verifyErr,
      );
    }
  }

  return { result, decision };
}
