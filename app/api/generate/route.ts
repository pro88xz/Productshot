import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { replicate } from '@/lib/replicate/client';
import { getSceneById, SCENE_STYLES } from '@/lib/replicate/scenes';
import { deductCredits, refundCredits, getCredits } from '@/lib/credits';
import {
  generateOneScene,
  fetchOrDecodeToBuffer,
} from '@/lib/inference/route-adapter';

// Configurable — change here if we swap models
const REPLICATE_MODEL = 'black-forest-labs/flux-kontext-pro';

// Allow up to 5 minutes for the full multi-image generation
export const maxDuration = 300;

const requestSchema = z.object({
  source_image_url: z.string().url(),
  scene_style_ids: z
    .array(z.string())
    .min(1, 'Pick at least one scene style.')
    .max(SCENE_STYLES.length, 'Too many scene styles requested.'),
});

export async function POST(request: NextRequest) {
  // ----- 1. Auth -----
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // ----- 2. Validate request -----
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request' },
      { status: 400 },
    );
  }

  const { source_image_url, scene_style_ids } = parsed.data;

  // Validate scene IDs against our whitelist (no arbitrary input)
  const scenes = scene_style_ids.map((id) => getSceneById(id)).filter((s) => s !== undefined);
  if (scenes.length !== scene_style_ids.length) {
    return NextResponse.json({ error: 'One or more scene styles is invalid.' }, { status: 400 });
  }

  const creditsNeeded = scenes.length;

  // ----- 3. Atomic credit deduction (BEFORE calling Replicate) -----
  const deducted = await deductCredits(user.id, creditsNeeded);
  if (!deducted) {
    return NextResponse.json(
      {
        error: `Not enough credits. You need ${creditsNeeded} credits for this generation.`,
      },
      { status: 402 },
    );
  }

  // ----- 4. Create the generation row (status: processing) -----
  const admin = createAdminClient();
  const { data: generation, error: insertError } = await admin
    .from('generations')
    .insert({
      user_id: user.id,
      status: 'processing',
      source_image_url,
      scene_styles: scene_style_ids,
      credits_used: creditsNeeded,
    })
    .select('id')
    .single();

  if (insertError || !generation) {
    await refundCredits(user.id, creditsNeeded);
    return NextResponse.json(
      { error: 'Could not start generation. Credits have been refunded.' },
      { status: 500 },
    );
  }

  const generationId = generation.id;

  // ----- 5. Call Replicate for each scene in parallel -----
  const outputUrls: string[] = [];
  const failures: { sceneId: string; error: string }[] = [];

  try {
    // Helper: retry Replicate calls with exponential backoff to handle
    // model cold-starts (idle models take 30-90s to boot, often timing out
    // the first request before they're warm).
    const runReplicateWithRetry = async (sceneId: string, prompt: string) => {
      const delays = [0, 5000, 15000]; // immediate, +5s, +15s
      let lastError: unknown = null;
      for (let attempt = 0; attempt < delays.length; attempt++) {
        if (delays[attempt] > 0) {
          await new Promise((r) => setTimeout(r, delays[attempt]));
        }
        try {
          return await replicate.run(REPLICATE_MODEL, {
            input: {
              prompt,
              input_image: source_image_url,
              output_format: 'jpg',
              safety_tolerance: 2,
            },
          });
        } catch (err) {
          lastError = err;
          console.warn(
            `Replicate attempt ${attempt + 1}/${delays.length} failed for scene ${sceneId}:`,
            err instanceof Error ? err.message : err,
          );
        }
      }
      throw lastError instanceof Error
        ? lastError
        : new Error('Replicate failed after retries');
    };

    // Feature flag: query param ?scaffold=1 OR env USE_SCAFFOLD_ROUTER=true
    const scaffoldQueryFlag =
      request.nextUrl?.searchParams?.get('scaffold') === '1';
    const scaffoldEnvFlag = process.env.USE_SCAFFOLD_ROUTER === 'true';
    const useScaffold = scaffoldQueryFlag || scaffoldEnvFlag;

    if (useScaffold) {
      console.log(
        `[api/generate] Scaffold routing ON (query=${scaffoldQueryFlag} env=${scaffoldEnvFlag}) for generation ${generationId}`,
      );
    }

    const results = await Promise.allSettled(
      scenes.map(async (scene) => {
        // Path A: Scaffold routing (per-scene compose/edit + verify + retry)
        if (useScaffold) {
          try {
            const out = await generateOneScene({
              userId: user.id,
              generationId,
              sourceImageUrl: source_image_url,
              sceneId: scene!.id,
              prompt: scene!.prompt,
            });
            return { sceneId: scene!.id, url: out.url };
          } catch (scaffoldErr) {
            // Production safety — fall through to legacy Replicate.
            console.warn(
              `[api/generate] Scaffold path failed for scene ${scene!.id}, falling back to legacy Replicate:`,
              scaffoldErr instanceof Error ? scaffoldErr.message : scaffoldErr,
            );
          }
        }

        // Path B: Legacy Replicate direct call
        const output = await runReplicateWithRetry(scene!.id, scene!.prompt);

        let url: string | null = null;
        if (typeof output === 'string') {
          url = output;
        } else if (Array.isArray(output) && typeof output[0] === 'string') {
          url = output[0];
        } else if (output && typeof output === 'object' && 'url' in output) {
          const maybeUrl = (output as { url: () => string }).url;
          if (typeof maybeUrl === 'function') {
            url = maybeUrl();
          }
        }

        if (!url) {
          throw new Error(`Replicate returned no usable URL for ${scene!.id}`);
        }

        return { sceneId: scene!.id, url };
      }),
    );

    for (const result of results) {
      if (result.status === 'fulfilled') {
        outputUrls.push(result.value.url);
      } else {
        failures.push({
          sceneId: 'unknown',
          error: result.reason?.message ?? 'Unknown error',
        });
      }
    }
  } catch (err) {
    console.error('Replicate call failed:', err);
    await admin
      .from('generations')
      .update({
        status: 'failed',
        error_message: err instanceof Error ? err.message : 'Unknown error',
        completed_at: new Date().toISOString(),
      })
      .eq('id', generationId);

    await refundCredits(user.id, creditsNeeded);

    return NextResponse.json(
      {
        error: 'Generation failed. Your credits have been refunded.',
        generation_id: generationId,
      },
      { status: 500 },
    );
  }

  // ----- 6. Handle partial failures -----
  if (outputUrls.length === 0) {
    await admin
      .from('generations')
      .update({
        status: 'failed',
        error_message: failures.map((f) => f.error).join('; '),
        completed_at: new Date().toISOString(),
      })
      .eq('id', generationId);

    await refundCredits(user.id, creditsNeeded);

    return NextResponse.json(
      { error: 'All generations failed. Your credits have been refunded.' },
      { status: 500 },
    );
  }

  if (failures.length > 0) {
    await refundCredits(user.id, failures.length);
  }

  // ----- 7. Save outputs to Supabase Storage -----
  const storedOutputUrls: string[] = [];

  for (let i = 0; i < outputUrls.length; i++) {
    const replicateUrl = outputUrls[i];
    try {
      // Handle both remote URLs (edit path) and data URIs (compose path)
      const buffer = await fetchOrDecodeToBuffer(replicateUrl);
      const blob = buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength,
      ) as ArrayBuffer;

      const storagePath = `${user.id}/generated/${generationId}/${i}.jpg`;
      const { error: uploadErr } = await admin.storage
        .from('product-photos')
        .upload(storagePath, blob, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (uploadErr) throw uploadErr;

      // Always serve via our own image route — fresh signed URLs every request
      storedOutputUrls.push(`/api/image/${generationId}/${i}`);
    } catch (err) {
      console.error('Storage upload error for image', i, err);
      // Skip this image rather than serve a dead URL
    }
  }

  // ----- 8. Mark generation completed -----
  await admin
    .from('generations')
    .update({
      status: 'completed',
      output_image_urls: storedOutputUrls,
      completed_at: new Date().toISOString(),
    })
    .eq('id', generationId);

  // ----- 9. Return the result -----
  const credits = await getCredits(user.id);

  return NextResponse.json({
    generation_id: generationId,
    status: 'completed',
    output_urls: storedOutputUrls,
    remaining_credits: credits.balance,
  });
}
