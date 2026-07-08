export type ProviderName = 'replicate' | 'fireworks';

export type ModelTier = 'kontext-pro' | 'flux-schnell' | 'compose-hybrid';

export type RenderPath = 'edit' | 'compose';

export interface GenerationRequest {
  sourceImageUrl: string;
  sceneId: string;
  /** Optional explicit prompt — if omitted, router pulls from SCENES config */
  prompt?: string;
  preferredPath?: RenderPath;
}

/**
 * Structured routing recommendation from the Gemma intelligence layer.
 * Advisory only — the router acts on it only above a confidence threshold,
 * and always has the static scene-based rule as a safe fallback.
 */
export interface GemmaRoutingAdvice {
  recommendedPath: RenderPath;
  confidence: number; // 0.0 - 1.0
  reasoning: string;
  riskFactors: string[];
  productCategory: string;
  usedFallback: boolean; // true if Gemma call failed/low-confidence and static rule was used
  /** True only if Gemma actually changed the outcome vs. the static scene default. */
  overrodeStatic: boolean;
  latencyMs: number;
  costUsd: number;
}

export interface VerificationResult {
  score: number;
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
  /** Populated by the Gemma routing-intelligence layer, when enabled */
  gemmaAdvice?: GemmaRoutingAdvice;
  /** Populated by compose path — breakdown of the sub-steps for demo dashboard */
  composeBreakdown?: {
    rembgMs: number;
    sceneGenMs: number;
    compositeMs: number;
    rembgCostUsd: number;
    sceneGenCostUsd: number;
  };
}

export interface InferenceProvider {
  readonly name: ProviderName;
  generate(req: GenerationRequest): Promise<Omit<GenerationResult, 'path' | 'verification'>>;
}

export const MODEL_COSTS: Record<ProviderName, Partial<Record<ModelTier, number>>> = {
  replicate: {
    'kontext-pro': 0.04,
    'flux-schnell': 0.003,
    'compose-hybrid': 0.004, // rembg $0.001 + schnell $0.003
  },
  fireworks: {},
};

export const KIMI_VERIFY_COST_USD = 0.0008;

// Gemma 3 4B IT on-demand H200 deployment — small model, ~150 input + ~120
// output tokens per routing call at ~$0.10/1M-token-equivalent pricing tier.
export const GEMMA_ROUTING_COST_USD = 0.00003;