import 'dotenv/config';
import { getGemmaRoutingAdvice } from '../../lib/inference/intelligence/gemma-router';

async function main() {
  process.env.ENABLE_SCAFFOLD_ROUTER = 'true';
  process.env.ENABLE_GEMMA_ROUTING = 'true';

  console.log('=== Gemma routing-intelligence smoke test ===');
  console.log('Model:', process.env.FIREWORKS_GEMMA_MODEL);
  console.log('');

  const cases = [
    {
      label: 'Glass bottle -> should lean compose (reflective/transparent risk)',
      input: {
        sceneId: 'studio-white',
        sceneDisplayName: 'Studio White',
        scenePreferredPath: 'edit' as const,
        productHint: 'a clear glass perfume bottle with a metallic reflective cap',
      },
    },
    {
      label: 'Cotton t-shirt -> should lean edit (low risk, opaque matte fabric)',
      input: {
        sceneId: 'lifestyle-home',
        sceneDisplayName: 'Lifestyle Home',
        scenePreferredPath: 'edit' as const,
        productHint: 'a plain cotton t-shirt, matte fabric, no logo',
      },
    },
    {
      label: 'No product hint -> should fall back to static default',
      input: {
        sceneId: 'studio-white',
        sceneDisplayName: 'Studio White',
        scenePreferredPath: 'compose' as const,
      },
    },
  ];

  for (const c of cases) {
    console.log(`--- ${c.label} ---`);
    const advice = await getGemmaRoutingAdvice(c.input);
    console.log(JSON.stringify(advice, null, 2));
    console.log('');
  }
}

main().catch((err) => {
  console.error('GEMMA SMOKE TEST FAILED:', err instanceof Error ? err.stack ?? err.message : err);
  process.exit(1);
});
