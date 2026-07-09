import type { GemmaRoutingAdvice, RenderPath } from '../types';
import { GEMMA_ROUTING_COST_USD } from '../types';

const FIREWORKS_CHAT = 'https://api.fireworks.ai/inference/v1/chat/completions';

// This points at the on-demand Fireworks deployment (see FIREWORKS_GEMMA_MODEL
// in .env.local), not a serverless model ID — Gemma has no serverless tier
// on Fireworks today, so this is a dedicated small deployment we own.
const GEMMA_MODEL = process.env.FIREWORKS_GEMMA_MODEL ?? '';

export interface GemmaRoutingInput {
  sceneId: string;
  sceneDisplayName: string;
  scenePreferredPath: RenderPath;
  /** The actual product photo. Gemma 3 4B IT is multimodal — passing this
   * lets it reason about real material/surface properties (reflective,
   * transparent, logo-heavy) instead of guessing from a text description
   * that, in practice, is never populated at this point in the request. */
  sourceImageUrl?: string;
  /** Optional text hint, kept for cases where a caller does have one. */
  productHint?: string;
  /** Optional: recent historical edit-path failure rate for this scene, 0-1 */
  historicalEditFailureRate?: number;
}

const SYSTEM_PROMPT = `You are Scaffold's routing-intelligence layer for AI product photography generation.

Scaffold has two rendering paths:
- EDIT: FLUX Kontext Pro edits the source photo directly in place. Fast, cheap
  (~$0.04/image), but can occasionally distort product identity — reflective,
  transparent, or text/logo-heavy products are the highest risk.
- COMPOSE: background removal + separately generated scene + sharp composite.
  Guarantees product identity is preserved by construction (the pixels are
  never touched), but costs more compute steps (~$0.005/image dominated by
  scene generation) and can look slightly less "integrated" in complex scenes.

You will usually be shown the actual product photo. Look at it directly:
assess material (glass, metal, chrome, fabric, plastic), surface finish
(reflective, transparent, matte), and whether it carries fine text/logos that
an edit-path model could distort. If no image is provided, reason from the
scene and any text hint alone, and lower your confidence accordingly.

Given the product and scene, recommend which path to try FIRST, so we don't
waste a costly edit-path attempt on a product that's likely to fail
verification and need a compose retry anyway.

Only recommend high confidence (>0.75) when you have a clear, specific reason
tied to the product's material/surface properties. When uncertain, return low
confidence — the caller falls back to safe static scene defaults in that case.

Respond in JSON matching the schema.`;

const ROUTING_SCHEMA = {
  type: 'object',
  properties: {
    // Order matters: reasoning fields come first so the model works through
    // the analysis before committing to recommendedPath/confidence. Putting
    // the decision fields first was causing the model to guess a path before
    // reasoning about it, producing outputs where reasoning argued for one
    // path while recommendedPath named the other.
    productCategory: {
      type: 'string',
      description: 'Short product category, e.g. "glass bottle", "leather bag", "sneaker"',
    },
    riskFactors: {
      type: 'array',
      items: { type: 'string' },
      description: 'Specific material/surface properties relevant to routing risk. Empty if none.',
    },
    reasoning: {
      type: 'string',
      description: 'One sentence weighing the risk factors and concluding which path is safer',
    },
    recommendedPath: {
      type: 'string',
      enum: ['edit', 'compose'],
      description: 'Which render path to try first — must match the conclusion of reasoning above',
    },
    confidence: {
      type: 'number',
      minimum: 0,
      maximum: 1,
      description: 'Confidence in this recommendation, 0.0 to 1.0',
    },
  },
  required: ['productCategory', 'riskFactors', 'reasoning', 'recommendedPath', 'confidence'],
  additionalProperties: false,
} as const;

interface FireworksChatResponse {
  choices?: Array<{
    message?: { content?: string; role?: string };
    finish_reason?: string;
  }>;
  error?: { message?: string };
}

interface ParsedAdvice {
  recommendedPath: RenderPath;
  confidence: number;
  productCategory: string;
  riskFactors: string[];
  reasoning: string;
}

function tryParseJson(s: string): ParsedAdvice | null {
  try {
    const parsed = JSON.parse(s) as Partial<ParsedAdvice>;
    if (parsed.recommendedPath !== 'edit' && parsed.recommendedPath !== 'compose') return null;
    if (typeof parsed.confidence !== 'number') return null;
    return {
      recommendedPath: parsed.recommendedPath,
      confidence: parsed.confidence,
      productCategory: typeof parsed.productCategory === 'string' ? parsed.productCategory : 'unknown',
      riskFactors: Array.isArray(parsed.riskFactors)
        ? parsed.riskFactors.filter((r): r is string => typeof r === 'string')
        : [],
      reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : '',
    };
  } catch {
    return null;
  }
}

function extractJsonObject(s: string): ParsedAdvice | null {
  let cleaned = s.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/```\s*$/, '');
  }

  const direct = tryParseJson(cleaned);
  if (direct) return direct;

  let depth = 0;
  let start = -1;
  let lastValid: ParsedAdvice | null = null;
  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (ch === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0 && start !== -1) {
        const slice = cleaned.slice(start, i + 1);
        if (slice.includes('"recommendedPath"')) {
          const parsed = tryParseJson(slice);
          if (parsed) lastValid = parsed;
        }
        start = -1;
      }
    }
  }
  return lastValid;
}

/**
 * The confidence floor above which the router will actually act on Gemma's
 * recommendation instead of falling back to the static scene default.
 */
const GEMMA_CONFIDENCE_FLOOR = parseFloat(
  process.env.GEMMA_ROUTING_CONFIDENCE_FLOOR ?? '0.75',
);

/**
 * Ask Gemma for a routing recommendation. Never throws — on any failure
 * (missing config, network error, low confidence, bad parse) it returns a
 * safe fallback advice object pointing at the static scene default, with
 * usedFallback: true so callers/telemetry can see what actually happened.
 */
export async function getGemmaRoutingAdvice(
  input: GemmaRoutingInput,
): Promise<GemmaRoutingAdvice> {
  const started = Date.now();
  const staticFallback = (reason: string): GemmaRoutingAdvice => ({
    recommendedPath: input.scenePreferredPath,
    confidence: 0,
    reasoning: reason,
    riskFactors: [],
    productCategory: 'unknown',
    usedFallback: true,
    overrodeStatic: false,
    latencyMs: Date.now() - started,
    costUsd: 0,
  });

  if (!process.env.ENABLE_GEMMA_ROUTING || process.env.ENABLE_GEMMA_ROUTING !== 'true') {
    return staticFallback('Gemma routing disabled via ENABLE_GEMMA_ROUTING');
  }

  const apiKey = process.env.FIREWORKS_API_KEY;
  if (!apiKey || !GEMMA_MODEL) {
    return staticFallback('FIREWORKS_API_KEY or FIREWORKS_GEMMA_MODEL not configured');
  }

  const userText = [
    `Scene: "${input.sceneDisplayName}" (id: ${input.sceneId})`,
    `Static default path for this scene: ${input.scenePreferredPath}`,
    input.productHint ? `Product hint: ${input.productHint}` : null,
    input.historicalEditFailureRate !== undefined
      ? `Historical edit-path verification failure rate for this scene: ${(input.historicalEditFailureRate * 100).toFixed(0)}%`
      : 'Historical edit-path failure rate: (no data yet)',
  ]
    .filter(Boolean)
    .join('\n');

  // Gemma 3 4B IT is multimodal — when we have the source photo, send it
  // alongside the text so Gemma reasons from the real product, not a guess.
  const userContent = input.sourceImageUrl
    ? [
        { type: 'text', text: userText },
        { type: 'image_url', image_url: { url: input.sourceImageUrl } },
      ]
    : userText;

  // Hard timeout: a cold on-demand Fireworks deployment can take ~90s to
  // scale up. We can't afford to block the user's generation on that — if
  // Gemma doesn't answer fast, we fall back to the static decision and let
  // Gemma keep warming in the background for next time. This must never
  // make the request slower than the no-Gemma path, only sometimes smarter.
  const timeoutMs = parseInt(process.env.GEMMA_ROUTING_TIMEOUT_MS ?? '2500', 10);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(FIREWORKS_CHAT, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GEMMA_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: { name: 'RoutingAdvice', schema: ROUTING_SCHEMA },
        },
        max_tokens: 400,
        temperature: 0.2,
      }),
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const text = await res.text();
      return staticFallback(`Gemma HTTP ${res.status}: ${text.slice(0, 200)}`);
    }

    const data = (await res.json()) as FireworksChatResponse;
    const content = data.choices?.[0]?.message?.content ?? '';
    const parsed = extractJsonObject(content);

    if (!parsed) {
      return staticFallback(`Gemma returned no parseable JSON: ${content.slice(0, 200)}`);
    }

    if (parsed.confidence < GEMMA_CONFIDENCE_FLOOR) {
      return {
        ...parsed,
        recommendedPath: input.scenePreferredPath,
        usedFallback: true,
        overrodeStatic: false,
        latencyMs: Date.now() - started,
        costUsd: GEMMA_ROUTING_COST_USD,
      };
    }

    return {
      ...parsed,
      usedFallback: false,
      overrodeStatic: parsed.recommendedPath !== input.scenePreferredPath,
      latencyMs: Date.now() - started,
      costUsd: GEMMA_ROUTING_COST_USD,
    };
  } catch (err) {
    clearTimeout(timeout);
    const isTimeout = err instanceof Error && err.name === 'AbortError';
    return staticFallback(
      isTimeout
        ? `Gemma routing timed out after ${timeoutMs}ms (likely cold deployment)`
        : `Gemma call threw: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
