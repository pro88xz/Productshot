/**
 * Shared types for the Scaffold inference layer.
 *
 * Two paths, one router:
 *   - 'edit'    : image-to-image via FLUX Kontext (currently Replicate)
 *   - 'compose' : background-remove + text-to-image scene + composite (Day 2+)
 *
 * Every generation is optionally verified by Kimi K2.6 on Fireworks.
 */

export type ProviderName = 'replicate' | 'fireworks';

export type ModelTier = 'kontext-pro' | 'flux-schnell';

export type RenderPath = 'edit' | 'compose';

export interface GenerationRequest {
  sourceImageUrl: string;
  sceneId: string;
  prompt: string;
  preferredPath?: RenderPath;
}

export interface VerificationResult {
  score: number; // 0-1, 1 = product identity fully preserved
  reasoning: string;
  concerns: string[];
  verifiedBy: 'kimi-k2p6';
  latencyMs: number;
  costUsd: number;
}

export interface GenerationResult {
  outputUrl: string;
  provider: ProviderName;
  path: RenderPath;
  tier: ModelTier;
  costUsd: number;
  latencyMs: number;
  wasFallback: boolean;
  providerRequestId?: string;
  verification?: VerificationResult;
}

export interface InferenceProvider {
  readonly name: ProviderName;
  generate(req: GenerationRequest): Promise<Omit<GenerationResult, 'path' | 'verification'>>;
}

export const MODEL_COSTS: Record<ProviderName, Partial<Record<ModelTier, number>>> = {
  replicate: {
    'kontext-pro': 0.04,
    'flux-schnell': 0.003,
  },
  fireworks: {
    // Fireworks image gen not accessible on this account tier — pivoted
    // to verification-only role via Kimi K2.6.
  },
};

// Kimi K2.6 verification cost: ~$0.0008 per call (small prompt + 2 images @ ~300 tokens)
export const KIMI_VERIFY_COST_USD = 0.0008;
