import 'dotenv/config';
import { generate } from '../../lib/inference';

async function main() {
  // Force router on for this test regardless of .env
  process.env.ENABLE_SCAFFOLD_ROUTER = 'true';

  console.log('=== Scaffold Day 1 smoke test ===');
  console.log('Pipeline: Replicate (FLUX Kontext) -> Fireworks (Kimi K2.6 verify)');
  console.log('Est. cost: ~$0.041 (Replicate $0.04 + Kimi $0.001)');
  console.log('');

  if (!process.env.REPLICATE_API_TOKEN) {
    console.error('REPLICATE_API_TOKEN not set. Aborting.');
    process.exit(1);
  }
  if (!process.env.FIREWORKS_API_KEY) {
    console.error('FIREWORKS_API_KEY not set. Aborting.');
    process.exit(1);
  }

  const sourceImageUrl =
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1024&q=80';

  const req = {
    sourceImageUrl,
    sceneId: 'studio-white',
    prompt:
      'Place this product on a clean pure white seamless studio background. Soft directional lighting from upper left, subtle natural shadow beneath the product. Professional product photography, sharp focus, commercial quality, centered composition. Preserve the exact product shape, color, materials, and details.',
  };

  console.log('Source image:', sourceImageUrl);
  console.log('Calling Replicate...');
  const started = Date.now();
  const { result, decision } = await generate(req);

  console.log('');
  console.log('=== ROUTING DECISION ===');
  console.log('Provider:      ', decision.primaryProvider);
  console.log('Path:          ', decision.path);
  console.log('Verification:  ', decision.runVerification ? 'ON' : 'OFF');
  console.log('Reason:        ', decision.reason);
  console.log('');
  console.log('=== GENERATION ===');
  console.log('Output URL:    ', result.outputUrl);
  console.log('Tier:          ', result.tier);
  console.log('Cost (est.):    $' + result.costUsd);
  console.log('Latency:       ', result.latencyMs + 'ms');
  console.log('');

  if (result.verification) {
    const v = result.verification;
    console.log('=== VERIFICATION (Fireworks Kimi K2.6) ===');
    console.log('Score:         ', v.score.toFixed(3), '/ 1.000');
    console.log('Reasoning:     ', v.reasoning);
    console.log('Concerns:      ', v.concerns.length ? v.concerns.join('; ') : '(none)');
    console.log('Latency:       ', v.latencyMs + 'ms');
    console.log('Cost (est.):    $' + v.costUsd);
    console.log('');
    console.log('Verdict:       ', v.score >= 0.72 ? 'PASS (would ship to user)' : 'FAIL (router would retry)');
  } else {
    console.log('(No verification result — see warnings above)');
  }

  console.log('');
  console.log('=== TOTAL WALL TIME ===');
  console.log(`${Date.now() - started}ms`);
}

main().catch((err) => {
  console.error('SMOKE TEST FAILED:', err instanceof Error ? err.message : err);
  process.exit(1);
});
