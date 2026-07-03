import type { GenerationResult, RenderPath, ProviderName } from './types';
import type { RoutingDecision } from './router';
import { createAdminClient } from '../supabase/admin';

const VERIFICATION_THRESHOLD = parseFloat(
  process.env.VERIFICATION_SIMILARITY_THRESHOLD ?? '0.72',
);

export interface LogRoutingEventInput {
  userId: string | null;
  generationId: string | null;
  sceneId: string;
  sourceImageUrl: string;
  decision: RoutingDecision;
  result: GenerationResult;
}

/**
 * Log one routing decision + result to public.routing_events.
 * Non-fatal — a logging failure doesn't affect the user's request.
 */
export async function logRoutingEvent(input: LogRoutingEventInput): Promise<void> {
  try {
    const { userId, generationId, sceneId, sourceImageUrl, decision, result } = input;

    const admin = createAdminClient();

    const verification = result.verification;
    const verifyPassed =
      verification !== undefined && verification.score >= VERIFICATION_THRESHOLD;

    const totalCost =
      result.costUsd + (verification?.costUsd ?? 0);

    const { error } = await admin.from('routing_events').insert({
      user_id: userId,
      generation_id: generationId,
      scene_id: sceneId,
      source_image_url: sourceImageUrl,

      path: decision.path,
      primary_provider: decision.primaryProvider,
      fallback_provider: null, // decision.fallbackProvider not in RoutingDecision yet
      was_fallback: result.wasFallback,
      decision_reason: decision.reason,

      tier: result.tier,
      cost_usd: result.costUsd,
      latency_ms: result.latencyMs,
      provider_request_id: result.providerRequestId ?? null,
      // Store null for data-URI outputs (too large for a text column, not meaningful)
      output_url: result.outputUrl.startsWith('data:') ? null : result.outputUrl,

      rembg_ms: result.composeBreakdown?.rembgMs ?? null,
      scene_gen_ms: result.composeBreakdown?.sceneGenMs ?? null,
      composite_ms: result.composeBreakdown?.compositeMs ?? null,
      rembg_cost_usd: result.composeBreakdown?.rembgCostUsd ?? null,
      scene_gen_cost_usd: result.composeBreakdown?.sceneGenCostUsd ?? null,

      verify_score: verification?.score ?? null,
      verify_reasoning: verification?.reasoning ?? null,
      verify_concerns: verification?.concerns ?? null,
      verify_latency_ms: verification?.latencyMs ?? null,
      verify_cost_usd: verification?.costUsd ?? null,
      verify_passed: verification ? verifyPassed : null,

      total_cost_usd: totalCost,
    });

    if (error) {
      console.warn('[scaffold-telemetry] insert failed (non-fatal):', error.message);
    }
  } catch (err) {
    console.warn(
      '[scaffold-telemetry] logging error (non-fatal):',
      err instanceof Error ? err.message : err,
    );
  }
}
