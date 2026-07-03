/**
 * One-time seeding script — generates curated backdrop library for the compose path.
 * Run: npm run seed:backdrops
 * Cost: ~$0.075 (25 backdrops @ $0.003 each)
 */
import 'dotenv/config';
import { replicate } from '../../lib/replicate/client';
import { extractUrl } from '../../lib/inference/providers/replicate';
import { createAdminClient } from '../../lib/supabase/admin';
import type { SceneId } from '../../lib/inference/scenes';

const VARIANTS_PER_SCENE = 5;
const BUCKET = 'product-photos';
const BACKDROP_PATH_PREFIX = 'scaffold-backdrops';

const SIMPLE_SCENES: SceneId[] = [
  'studio-white',
  'marble-flatlay',
  'moody-dark',
  'minimal-pastel',
  'colorful-pop',
];

const BACKDROP_PROMPTS: Record<SceneId, string[]> = {
  'studio-white': [
    'A close-up photograph of a smooth pure white paper backdrop surface, seamless texture, no objects, no scene, no depth, just clean white surface with the very subtlest gradient from soft overhead lighting, product photography surface texture, 1024x1024',
    'Empty white seamless studio floor sweep, no walls no ceiling, photographed straight-on, absolutely no objects, minimal soft shadow gradient at the very bottom edge, professional backdrop texture, 1024x1024',
    'Pure clean white surface texture, smooth matte finish, extremely subtle floor gradient, seamless, no props, no visible edges or frames, just the flat empty backdrop, 1024x1024',
    'A large sheet of pure white photography paper, softly lit from above, no objects, no borders, edge to edge white with faint gradient, 1024x1024',
    'Minimalist white backdrop, matte finish, extremely soft even lighting, pure white paper texture only, absolutely empty, 1024x1024',
  ],
  'marble-flatlay': [
    'Top-down close-up of a white and grey Carrara marble surface, tightly cropped texture only, no objects, no depth, natural veining, bright even daylight, seamless flat surface, 1024x1024',
    'Empty white marble slab photographed straight down, subtle grey veining, absolutely no objects, edge to edge marble texture, bright natural light, 1024x1024',
    'Luxurious veined marble surface texture, top-down flat view, no objects, no props, no scene, pure marble surface only, editorial photography, 1024x1024',
    'Close-up macro of polished white marble with soft grey veining, top-down empty texture, bright airy natural light, seamless, 1024x1024',
    'Solid white marble with delicate grey veining, tabletop surface texture, no objects on it, top-down flat perspective, editorial minimalism, 1024x1024',
  ],
  'moody-dark': [
    'A close-up of a dark textured slate surface, single warm side light from the left creating a bright edge and deep shadows across the surface, no objects, no scene, just the surface texture, cinematic moody backdrop, 1024x1024',
    'Empty dark stone surface with dramatic warm sidelight from left, deep shadows on right, no props, no objects, luxury moody backdrop texture, 1024x1024',
    'Weathered dark slate texture, single warm rim light from the left edge, atmospheric shadow gradient, absolutely empty, cinematic backdrop, 1024x1024',
    'Rich dark stone or concrete surface, moody warm side lighting, deep chiaroscuro shadow falling to the right, no scene elements, backdrop texture only, 1024x1024',
    'Textured black slate with amber side light, no objects, cinematic mood, empty backdrop surface, 1024x1024',
  ],
  'minimal-pastel': [
    'A soft pastel gradient surface, blush pink smoothly transitioning to warm cream, absolutely no objects, no scene, edge-to-edge gradient texture only, bright airy editorial backdrop, 1024x1024',
    'Empty pastel pink to cream gradient backdrop, no props, no borders, smooth even light, minimalist paper surface texture, 1024x1024',
    'Soft blush and cream gradient wash, seamless surface, no objects, bright even studio light, editorial minimalist backdrop, 1024x1024',
    'Pale pink fading to warm ivory, smooth gradient, absolutely empty backdrop texture, no scene, 1024x1024',
    'Dreamy pastel pink-cream gradient, soft matte finish, pure backdrop surface no objects, editorial aesthetic, 1024x1024',
  ],
  'colorful-pop': [
    'Bold two-tone color-blocked backdrop — vibrant coral occupying the top half and rich teal occupying the bottom half, hard horizontal edge where they meet, seamless flat surface texture, no objects, no scene, bright even studio lighting, 1024x1024',
    'Coral and teal color-blocked paper backdrop, sharp horizontal division, no props, playful pop-art surface texture, edge to edge, 1024x1024',
    'Vibrant coral top, deep teal bottom, hard color block backdrop, empty surface, bold graphic backdrop texture, 1024x1024',
    'Two-color pop-art backdrop — coral over teal, minimalist geometric backdrop, no scene elements, seamless texture, 1024x1024',
    'Bold color-blocked backdrop coral and teal, hard edge horizon, absolutely empty, pop-art aesthetic backdrop, 1024x1024',
  ],
  'wood-shelf': [],
  'lifestyle-home': [],
  'natural-outdoor': [],
};

async function withRateLimitRetry<T>(
  op: () => Promise<T>,
  label: string,
  maxAttempts = 5,
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await op();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const is429 = msg.includes('429') || msg.toLowerCase().includes('throttled');
      if (!is429 || attempt === maxAttempts) throw err;
      const retryMatch = msg.match(/"retry_after":\s*(\d+)/);
      const waitSec = retryMatch ? parseInt(retryMatch[1], 10) + 1 : 5 * attempt;
      console.log(`    [${label}] rate-limited, waiting ${waitSec}s...`);
      await new Promise((r) => setTimeout(r, waitSec * 1000));
    }
  }
  throw new Error(`${label}: exhausted retries`);
}

async function generateOne(prompt: string): Promise<Buffer> {
  const raw = await withRateLimitRetry(
    () =>
      replicate.run('black-forest-labs/flux-schnell', {
        input: {
          prompt,
          aspect_ratio: '1:1',
          output_format: 'jpg',
          output_quality: 92,
          num_outputs: 1,
          num_inference_steps: 4,
        },
      }),
    'flux-schnell',
  );
  const url = extractUrl(raw);
  if (!url) throw new Error(`schnell no URL: ${JSON.stringify(raw).slice(0, 200)}`);
  const res = await fetch(url);
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  const admin = createAdminClient();
  console.log('=== Scaffold backdrop seeding ===');
  console.log(`Scenes: ${SIMPLE_SCENES.join(', ')}`);
  console.log(`Variants per scene: ${VARIANTS_PER_SCENE}`);
  console.log(`Est. cost: $${(SIMPLE_SCENES.length * VARIANTS_PER_SCENE * 0.003).toFixed(3)}`);
  console.log('');

  let totalGenerated = 0;
  let totalFailed = 0;

  for (const sceneId of SIMPLE_SCENES) {
    const prompts = BACKDROP_PROMPTS[sceneId];
    if (!prompts || prompts.length === 0) continue;

    console.log(`--- ${sceneId} ---`);
    for (let i = 0; i < VARIANTS_PER_SCENE; i++) {
      const prompt = prompts[i % prompts.length];
      const started = Date.now();
      try {
        const jpg = await generateOne(prompt);
        const storagePath = `${BACKDROP_PATH_PREFIX}/${sceneId}/${i}.jpg`;

        const { error: uploadErr } = await admin.storage
          .from(BUCKET)
          .upload(storagePath, jpg, { contentType: 'image/jpeg', upsert: true });
        if (uploadErr) throw uploadErr;

        const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(storagePath);

        const { error: dbErr } = await admin.from('scaffold_backdrops').upsert(
          {
            scene_id: sceneId,
            variant_index: i,
            storage_path: storagePath,
            public_url: pub.publicUrl,
            prompt,
          },
          { onConflict: 'scene_id,variant_index' },
        );
        if (dbErr) throw dbErr;

        totalGenerated++;
        console.log(`  [${i + 1}/${VARIANTS_PER_SCENE}] uploaded ${storagePath} (${Date.now() - started}ms)`);
      } catch (err) {
        totalFailed++;
        console.log(`  [${i + 1}/${VARIANTS_PER_SCENE}] FAILED: ${err instanceof Error ? err.message : err}`);
      }
    }
    console.log('');
  }

  console.log('=== SEEDING COMPLETE ===');
  console.log(`Generated: ${totalGenerated}`);
  console.log(`Failed:    ${totalFailed}`);
  console.log(`Est. cost: $${(totalGenerated * 0.003).toFixed(3)}`);
}

main().catch((err) => {
  console.error('SEEDING FAILED:', err instanceof Error ? err.stack ?? err.message : err);
  process.exit(1);
});
