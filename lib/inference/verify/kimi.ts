import type { VerificationResult } from '../types';
import { KIMI_VERIFY_COST_USD } from '../types';

const FIREWORKS_CHAT = 'https://api.fireworks.ai/inference/v1/chat/completions';
const KIMI_MODEL = 'accounts/fireworks/models/kimi-k2p6';

export interface VerifyInput {
  sourceImageUrl: string;
  generatedImageUrl: string;
  productHint?: string;
}

const SYSTEM_PROMPT = `You are Scaffold's quality-control agent for AI-generated product photography.

You will see two images:
1. ORIGINAL: the seller's product photo
2. GENERATED: an AI-generated version placing the product in a new scene

Judge only how faithfully the PRODUCT identity was preserved.

Focus on: shape, color, material, text/logos, proportions, distinctive features.
Ignore: scene background, lighting mood, artistic style, composition — those are meant to change.

Score guide:
  1.0 = pixel-identical product, only scene changed
  0.9 = product identity clearly preserved, minor rendering variance
  0.7 = same product family but noticeable distortions
  0.5 = related product but altered enough to mislead a buyer
  0.0 = completely different product

Respond in JSON matching the schema.`;

// JSON schema fed to Fireworks — the model is grammar-constrained to emit exactly this shape.
const VERIFICATION_SCHEMA = {
  type: 'object',
  properties: {
    score: {
      type: 'number',
      minimum: 0,
      maximum: 1,
      description: 'How faithfully the product identity was preserved, 0.0 to 1.0',
    },
    reasoning: {
      type: 'string',
      description: 'One sentence explaining the score',
    },
    concerns: {
      type: 'array',
      items: { type: 'string' },
      description: 'Specific product-identity distortions observed. Empty array if none.',
    },
  },
  required: ['score', 'reasoning', 'concerns'],
  additionalProperties: false,
} as const;

interface FireworksChatResponse {
  choices?: Array<{
    message?: {
      content?: string;
      reasoning_content?: string;
      role?: string;
    };
    finish_reason?: string;
  }>;
  error?: { message?: string };
}

interface ParsedKimi {
  score: number;
  reasoning: string;
  concerns: string[];
}

function tryParseJson(s: string): ParsedKimi | null {
  try {
    const parsed = JSON.parse(s) as Partial<ParsedKimi>;
    if (typeof parsed.score !== 'number') return null;
    return {
      score: parsed.score,
      reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : '',
      concerns: Array.isArray(parsed.concerns)
        ? parsed.concerns.filter((c): c is string => typeof c === 'string')
        : [],
    };
  } catch {
    return null;
  }
}

/**
 * Fallback extractor for cases where JSON schema enforcement gets bypassed
 * (rare — but reasoning models occasionally emit markdown code fences even in json mode).
 */
function extractJsonObject(s: string): ParsedKimi | null {
  // Strip code fences if present
  let cleaned = s.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/```\s*$/, '');
  }

  const direct = tryParseJson(cleaned);
  if (direct) return direct;

  // Fall back: find last balanced object containing "score"
  let depth = 0;
  let start = -1;
  let lastValid: ParsedKimi | null = null;
  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (ch === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0 && start !== -1) {
        const slice = cleaned.slice(start, i + 1);
        if (slice.includes('"score"')) {
          const parsed = tryParseJson(slice);
          if (parsed) lastValid = parsed;
        }
        start = -1;
      }
    }
  }
  return lastValid;
}

export async function verifyWithKimi(input: VerifyInput): Promise<VerificationResult> {
  const apiKey = process.env.FIREWORKS_API_KEY;
  if (!apiKey) throw new Error('FIREWORKS_API_KEY is not set');

  const started = Date.now();

  const body = {
    model: KIMI_MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'ORIGINAL product photo:' },
          { type: 'image_url', image_url: { url: input.sourceImageUrl } },
          { type: 'text', text: 'GENERATED product photo:' },
          { type: 'image_url', image_url: { url: input.generatedImageUrl } },
          ...(input.productHint
            ? [{ type: 'text' as const, text: `Product hint: ${input.productHint}` }]
            : []),
        ],
      },
    ],
    // Fireworks grammar-guided decoding: model CAN'T emit anything but valid JSON
    // matching this schema. Reasoning happens internally.
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'ProductVerification',
        schema: VERIFICATION_SCHEMA,
      },
    },
    max_tokens: 4000, // reasoning + JSON together; generous budget
    temperature: 0.1,
  };

  const res = await fetch(FIREWORKS_CHAT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Kimi verify HTTP ${res.status}: ${text.slice(0, 500)}`);
  }

  const data = (await res.json()) as FireworksChatResponse;
  const message = data.choices?.[0]?.message;
  const finishReason = data.choices?.[0]?.finish_reason;
  const content = message?.content ?? '';
  const reasoning = message?.reasoning_content ?? '';

  if (process.env.DEBUG_KIMI === 'true') {
    console.log('[kimi-debug] finish_reason:', finishReason);
    console.log('[kimi-debug] reasoning_content len:', reasoning.length);
    console.log('[kimi-debug] content:', JSON.stringify(content.slice(0, 500)));
  }

  if (finishReason === 'length') {
    throw new Error(
      `Kimi hit token cap (max_tokens=4000, reasoning_len=${reasoning.length}). Increase budget.`,
    );
  }

  const parsed = extractJsonObject(content);
  if (!parsed) {
    throw new Error(
      `Kimi returned no parseable JSON. finish_reason=${finishReason} content=${content.slice(0, 300)}`,
    );
  }

  return {
    score: Math.max(0, Math.min(1, parsed.score)),
    reasoning: parsed.reasoning || '(no reasoning provided)',
    concerns: parsed.concerns,
    verifiedBy: 'kimi-k2p6',
    latencyMs: Date.now() - started,
    costUsd: KIMI_VERIFY_COST_USD,
  };
}
