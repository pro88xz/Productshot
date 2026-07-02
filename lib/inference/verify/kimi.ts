import type { VerificationResult } from '../types';
import { KIMI_VERIFY_COST_USD } from '../types';

const FIREWORKS_CHAT = 'https://api.fireworks.ai/inference/v1/chat/completions';
const KIMI_MODEL = 'accounts/fireworks/models/kimi-k2p6';

export interface VerifyInput {
  sourceImageUrl: string;
  generatedImageUrl: string;
  productHint?: string;
}

const SYSTEM_PROMPT = `You are Scaffold's silent quality-control gate for AI-generated product photography.

Rules — no exceptions:
1. Do NOT think out loud. Do NOT narrate. Do NOT explain your process.
2. Your ENTIRE response must be exactly one JSON object and nothing else.
3. Begin your response with { and end with }. No other characters, no code fences, no prose.

You will receive two images:
- ORIGINAL: the seller's product photo
- GENERATED: the AI-edited version placed in a new scene

Judge only how faithfully the PRODUCT identity was preserved (shape, color, material, text, logos, proportions). Ignore intentional scene, lighting, and background differences.

Emit exactly this JSON schema:
{"score": <0.0-1.0>, "reasoning": "<one sentence>", "concerns": ["<issue>", "..."]}

Score guide:
1.0 = pixel-identical product; 0.9 = clearly preserved with rendering variance; 0.7 = noticeable distortions; 0.5 = would mislead a buyer; 0.0 = different product.`;

interface FireworksChatResponse {
  choices?: Array<{
    message?: { content?: string; role?: string };
    finish_reason?: string;
  }>;
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
          {
            type: 'text',
            text: 'Emit the JSON object now. No preamble. Start with { and end with }.',
          },
        ],
      },
      // Prefill: force Kimi to continue from an opening brace so it can't narrate.
      { role: 'assistant', content: '{"score":' },
    ],
    max_tokens: 800,
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
  const raw = data.choices?.[0]?.message?.content ?? '';

  // We prefilled '{' — Kimi's response starts AFTER that, so prepend it back.
  const candidate = '{"score":' + raw;

  // Try full-string parse first (cleanest)
  const parsed = tryParseJson(candidate) ?? extractFirstJsonObject(candidate);
  if (!parsed) {
    throw new Error(
      `Kimi returned no parseable JSON. Raw (first 500 chars): ${candidate.slice(0, 500)}`,
    );
  }

  const score = typeof parsed.score === 'number' ? parsed.score : 0;

  return {
    score: Math.max(0, Math.min(1, score)),
    reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : '(no reasoning)',
    concerns: Array.isArray(parsed.concerns)
      ? parsed.concerns.filter((c: unknown): c is string => typeof c === 'string')
      : [],
    verifiedBy: 'kimi-k2p6',
    latencyMs: Date.now() - started,
    costUsd: KIMI_VERIFY_COST_USD,
  };
}

interface ParsedKimi {
  score?: number;
  reasoning?: string;
  concerns?: unknown[];
}

function tryParseJson(s: string): ParsedKimi | null {
  try {
    return JSON.parse(s) as ParsedKimi;
  } catch {
    return null;
  }
}

// Walk the string, find balanced JSON object containing "score"
function extractFirstJsonObject(s: string): ParsedKimi | null {
  let depth = 0;
  let start = -1;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0 && start !== -1) {
        const slice = s.slice(start, i + 1);
        if (slice.includes('"score"')) {
          const parsed = tryParseJson(slice);
          if (parsed) return parsed;
        }
        start = -1;
      }
    }
  }
  return null;
}
