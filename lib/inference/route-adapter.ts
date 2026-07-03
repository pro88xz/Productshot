/**
 * Adapter that lets /api/generate route a single scene through the Scaffold
 * inference pipeline without changing the route's return shape.
 *
 * The route's existing storage step already knows how to handle remote URLs.
 * For compose-path results (which return data URIs), it also needs to handle
 * data: URIs — see the tiny fetchOrDecodeToBuffer helper.
 */
import { generate } from './router';
import type { RenderPath } from './types';

export interface AdapterInput {
  userId: string;
  generationId: string;
  sourceImageUrl: string;
  sceneId: string;
  prompt?: string;
  preferredPath?: RenderPath;
}

export interface AdapterOutput {
  sceneId: string;
  /** Either a remote URL (edit path) or a data URI (compose path). */
  url: string;
  path: RenderPath;
  tier: string;
  costUsd: number;
  latencyMs: number;
  wasFallback: boolean;
  verifyScore?: number;
  verifyPassed?: boolean;
}

export async function generateOneScene(input: AdapterInput): Promise<AdapterOutput> {
  const { result, decision } = await generate(
    {
      sourceImageUrl: input.sourceImageUrl,
      sceneId: input.sceneId,
      prompt: input.prompt,
      preferredPath: input.preferredPath,
    },
    {
      userId: input.userId,
      generationId: input.generationId,
    },
  );

  return {
    sceneId: input.sceneId,
    url: result.outputUrl,
    path: decision.path,
    tier: result.tier,
    costUsd: result.costUsd,
    latencyMs: result.latencyMs,
    wasFallback: result.wasFallback,
    verifyScore: result.verification?.score,
    verifyPassed:
      result.verification !== undefined
        ? result.verification.score >= 0.72
        : undefined,
  };
}

/**
 * Helper: turn a remote URL OR a data: URI into a Buffer that can be uploaded
 * to Supabase Storage.
 */
export async function fetchOrDecodeToBuffer(urlOrDataUri: string): Promise<Buffer> {
  if (urlOrDataUri.startsWith('data:')) {
    const commaIdx = urlOrDataUri.indexOf(',');
    if (commaIdx === -1) throw new Error('Malformed data URI');
    const b64 = urlOrDataUri.slice(commaIdx + 1);
    return Buffer.from(b64, 'base64');
  }
  const res = await fetch(urlOrDataUri);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}
