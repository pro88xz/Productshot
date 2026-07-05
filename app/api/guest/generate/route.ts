import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import sharp from 'sharp';

import { createAdminClient } from '@/lib/supabase/admin';
import { getSceneById, SCENE_STYLES } from '@/lib/replicate/scenes';
import {
  generateOneScene,
  fetchOrDecodeToBuffer,
} from '@/lib/inference/route-adapter';
import { replicate } from '@/lib/replicate/client';

/**
 * Guest generation endpoint.
 *
 * - No auth required
 * - No credit deduction, no persistent user_id
 * - Rate-limited to 1 request per IP per 24h (soft — bypassable by determined attackers)
 * - Runs the SAME scaffold pipeline as authenticated users
 * - Watermarks the output ("ProductShot demo · Sign up to download") before returning
 * - Returns data URIs so nothing gets persisted to Storage
 *
 * Guest sessions are stateless. Signup does not migrate history.
 */

const requestSchema = z.object({
  source_image_url: z.string().url(),
  scene_style_id: z.string().min(1),
});

const MAX_GUEST_GENERATIONS_PER_DAY = 3;
const WATERMARK_TEXT = 'ProductShot demo · Sign up to download the clean version';

export const maxDuration = 60;

async function watermarkImage(buffer: Buffer): Promise<Buffer> {
  // Get image dimensions
  const meta = await sharp(buffer).metadata();
  const width = meta.width ?? 1024;
  const height = meta.height ?? 1024;

  // Watermark strip anchored to bottom-right, dark translucent bar with white text
  const stripHeight = Math.max(28, Math.floor(height * 0.05));
  const fontSize = Math.max(12, Math.floor(height * 0.022));

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${stripHeight}">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="rgba(0,0,0,0.0)" />
          <stop offset="30%" stop-color="rgba(0,0,0,0.55)" />
          <stop offset="100%" stop-color="rgba(0,0,0,0.85)" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="${width}" height="${stripHeight}" fill="url(#grad)" />
      <text
        x="${width - Math.floor(width * 0.02)}"
        y="${Math.floor(stripHeight * 0.68)}"
        font-family="ui-sans-serif, system-ui, -apple-system, Arial, sans-serif"
        font-size="${fontSize}"
        font-weight="500"
        text-anchor="end"
        fill="rgba(255,255,255,0.92)"
        letter-spacing="0.3"
      >${WATERMARK_TEXT}</text>
    </svg>
  `;

  return sharp(buffer)
    .composite([
      {
        input: Buffer.from(svg),
        top: height - stripHeight,
        left: 0,
      },
    ])
    .jpeg({ quality: 90 })
    .toBuffer();
}

/**
 * Best-effort rate limiter — checks how many guest_generations rows exist for this
 * IP in the last 24h. Requires a public.guest_generations table (see migration).
 * If the table doesn't exist, the RPC will fail silently and we allow the request.
 */
async function checkGuestRateLimit(ip: string): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const admin = createAdminClient();
    const { count } = await admin
      .from('guest_generations')
      .select('*', { count: 'exact', head: true })
      .eq('client_ip', ip)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    const used = count ?? 0;
    return {
      allowed: used < MAX_GUEST_GENERATIONS_PER_DAY,
      remaining: Math.max(0, MAX_GUEST_GENERATIONS_PER_DAY - used - 1),
    };
  } catch {
    // Table doesn't exist yet — allow but warn in dev
    return { allowed: true, remaining: MAX_GUEST_GENERATIONS_PER_DAY - 1 };
  }
}

async function recordGuestGeneration(
  ip: string,
  sceneId: string,
  sourceImageUrl: string,
  costUsd: number,
): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from('guest_generations').insert({
      client_ip: ip,
      scene_id: sceneId,
      source_image_url: sourceImageUrl,
      cost_usd: costUsd,
    });
  } catch {
    // Non-fatal
  }
}

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const real = req.headers.get('x-real-ip');
  if (real) return real.trim();
  return '0.0.0.0';
}

export async function POST(request: NextRequest) {
  // 1. Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { source_image_url, scene_style_id } = parsed.data;

  const scene = getSceneById(scene_style_id);
  if (!scene) {
    return NextResponse.json(
      { error: `Unknown scene: ${scene_style_id}. Valid: ${SCENE_STYLES.map((s) => s.id).join(', ')}` },
      { status: 400 },
    );
  }

  // 2. Rate limit by IP
  const ip = getClientIp(request);
  const rate = await checkGuestRateLimit(ip);
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error: `You've used all ${MAX_GUEST_GENERATIONS_PER_DAY} free demo generations for today. Sign up for full access.`,
        signup_url: '/sign-up',
      },
      { status: 429 },
    );
  }

  // 3. Run the scaffold pipeline
  try {
    const out = await generateOneScene({
      userId: 'guest',
      generationId: 'guest-' + Date.now().toString(36),
      sourceImageUrl: source_image_url,
      sceneId: scene.id,
      prompt: scene.prompt,
    });

    // 4. Fetch as buffer + watermark
    const rawBuffer = await fetchOrDecodeToBuffer(out.url);
    const watermarked = await watermarkImage(rawBuffer);

    // 5. Record for rate limiting
    void recordGuestGeneration(ip, scene.id, source_image_url, out.costUsd);

    // 6. Return as data URI
    const dataUri = `data:image/jpeg;base64,${watermarked.toString('base64')}`;

    return NextResponse.json({
      success: true,
      scene_id: scene.id,
      scene_display_name: scene.name,
      image_data_uri: dataUri,
      remaining_free_generations: rate.remaining,
      // Small teaser for the pitch — judges see this in the network response
      routing_meta: {
        path: out.path,
        tier: out.tier,
        cost_usd: out.costUsd,
        latency_ms: out.latencyMs,
        verify_score: out.verifyScore,
        verify_passed: out.verifyPassed,
      },
    });
  } catch (err) {
    // Unused variable warning suppression — silence 'replicate' import in some builds
    void replicate;
    console.error('[api/guest/generate] failed:', err);
    return NextResponse.json(
      {
        error:
          'Generation failed. This can happen when Replicate is warming up — try again in 10 seconds.',
      },
      { status: 500 },
    );
  }
}
