/**
 * Force EDIT_MIN_VERIFY_SCORE=0.95 BEFORE dotenv or any other import runs.
 * The router reads it once at module load, so it must be set before that.
 */
process.env.EDIT_MIN_VERIFY_SCORE = '0.95';
process.env.ENABLE_SCAFFOLD_ROUTER = 'true';

import 'dotenv/config';
import { generate } from '../../lib/inference';

async function main() {
  console.log('=== Verification-driven retry demo ===');
  console.log('EDIT_MIN_VERIFY_SCORE (from env):', process.env.EDIT_MIN_VERIFY_SCORE);
  console.log('ENABLE_SCAFFOLD_ROUTER (from env):', process.env.ENABLE_SCAFFOLD_ROUTER);
  console.log('');

  const sourceImageUrl =
    'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=1024&q=80';

  console.log('--- Requesting lifestyle-home (edit path by default) ---');
  const started = Date.now();
  const { result, decision } = await generate({
    sourceImageUrl,
    sceneId: 'lifestyle-home',
  });

  console.log('');
  console.log('=== FINAL RESULT ===');
  console.log('Path shipped:      ', decision.path);
  console.log('Reason:            ', decision.reason);
  console.log('wasFallback:       ', result.wasFallback);
  console.log('Cost (cumulative): $' + result.costUsd.toFixed(4));
  console.log('Latency (cumul):   ', result.latencyMs + 'ms');
  console.log('Verify score:      ', result.verification?.score.toFixed(2) ?? 'n/a');
  console.log('Wall time:         ', (Date.now() - started) + 'ms');
  console.log('');

  if (result.wasFallback) {
    console.log('OK: Retry logic fired — compose fallback shipped');
  } else {
    console.log('INFO: No retry — edit path passed verification threshold');
  }
}

main().catch((err) => {
  console.error('FAILED:', err instanceof Error ? err.stack ?? err.message : err);
  process.exit(1);
});
