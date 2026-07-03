import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { generate } from '../../lib/inference';

const SMOKE_USER_ID = process.env.SMOKE_USER_ID ?? null;
const SMOKE_GENERATION_ID = process.env.SMOKE_GENERATION_ID ?? null;

interface RunOutput {
  label: string;
  sceneId: string;
  path: string;
  cost: number;
  latencyMs: number;
  score: number | null;
  outputUrl: string;
  concerns: string[];
}

async function runOne(sceneId: string, forcePath?: 'compose' | 'edit'): Promise<RunOutput> {
  // Test image: clean product with clear background separation
  // (rembg struggles on the previous watch photo where grey watches sat on grey bg)
  const sourceImageUrl =
    'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=1024&q=80';

  const { result, decision } = await generate(
    {
      sourceImageUrl,
      sceneId,
      preferredPath: forcePath,
    },
    {
      userId: SMOKE_USER_ID,
      generationId: SMOKE_GENERATION_ID,
    },
  );

  return {
    label: `${sceneId} (${decision.path})`,
    sceneId,
    path: decision.path,
    cost: result.costUsd + (result.verification?.costUsd ?? 0),
    latencyMs: result.latencyMs,
    score: result.verification?.score ?? null,
    outputUrl: result.outputUrl,
    concerns: result.verification?.concerns ?? [],
  };
}

async function main() {
  process.env.ENABLE_SCAFFOLD_ROUTER = 'true';

  console.log('=== Scaffold Day 2 smoke test — router with per-scene paths ===');
  console.log('');
  console.log('Running two scenes:');
  console.log('  1. studio-white  -> compose path (rembg + flux-schnell + sharp)');
  console.log('  2. lifestyle-home -> edit path (flux-kontext-pro)');
  console.log('Both verified by Kimi K2.6 on Fireworks.');
  console.log('');

  const started = Date.now();
  const runs: RunOutput[] = [];

  console.log('--- Run 1: studio-white via compose ---');
  runs.push(await runOne('studio-white'));
  console.log('done.');
  console.log('');

  console.log('--- Run 2: lifestyle-home via edit ---');
  runs.push(await runOne('lifestyle-home'));
  console.log('done.');
  console.log('');

  console.log('=== COMPARISON ===');
  console.log('');
  console.log(
    '| Scene              | Path    | Cost      | Latency | Verify | Verdict |',
  );
  console.log(
    '|--------------------|---------|-----------|---------|--------|---------|',
  );
  for (const r of runs) {
    const cost = '$' + r.cost.toFixed(4);
    const latency = (r.latencyMs / 1000).toFixed(1) + 's';
    const verify = r.score === null ? 'n/a' : r.score.toFixed(2);
    const verdict =
      r.score === null ? '?' : r.score >= 0.72 ? 'PASS' : 'FAIL';
    console.log(
      `| ${r.label.padEnd(18)} | ${r.path.padEnd(7)} | ${cost.padEnd(9)} | ${latency.padEnd(7)} | ${verify.padEnd(6)} | ${verdict.padEnd(7)} |`,
    );
  }
  console.log('');

  const totalCost = runs.reduce((s, r) => s + r.cost, 0);
  console.log('Total cost this run:   $' + totalCost.toFixed(4));

  const composeRun = runs.find((r) => r.path === 'compose');
  const editRun = runs.find((r) => r.path === 'edit');
  if (composeRun && editRun) {
    const savings = ((editRun.cost - composeRun.cost) / editRun.cost) * 100;
    console.log(
      `Compose vs Edit:       ${savings.toFixed(0)}% cheaper (${composeRun.cost.toFixed(4)} vs ${editRun.cost.toFixed(4)})`,
    );
  }
  console.log('Total wall time:       ' + ((Date.now() - started) / 1000).toFixed(1) + 's');
  console.log('');

  console.log('=== OUTPUT URLS ===');
  for (const r of runs) {
    if (r.outputUrl.startsWith('data:')) {
      console.log(`${r.label}: [data URI, ${(r.outputUrl.length / 1024).toFixed(0)}KB base64 — see below]`);
    } else {
      console.log(`${r.label}: ${r.outputUrl}`);
    }
  }

  // Save outputs to /tmp for eyeball review
  const fs = await import('node:fs');
  for (const r of runs) {
    const path = `/tmp/scaffold-${r.sceneId}.jpg`;
    if (r.outputUrl.startsWith('data:image/jpeg;base64,')) {
      const b64 = r.outputUrl.slice('data:image/jpeg;base64,'.length);
      fs.writeFileSync(path, Buffer.from(b64, 'base64'));
      console.log(`  saved: ${path}`);
    } else {
      // Remote URL — fetch and save so both paths produce a local file
      try {
        const res = await fetch(r.outputUrl);
        const ab = await res.arrayBuffer();
        fs.writeFileSync(path, Buffer.from(ab));
        console.log(`  saved: ${path}`);
      } catch (err) {
        console.log(`  save failed for ${r.label}: ${err instanceof Error ? err.message : err}`);
      }
    }
  }

  if (runs.some((r) => r.concerns.length > 0)) {
    console.log('');
    console.log('=== KIMI CONCERNS ===');
    for (const r of runs) {
      if (r.concerns.length > 0) {
        console.log(`${r.label}:`);
        for (const c of r.concerns) console.log(`  - ${c}`);
      }
    }
  }
}

main().catch((err) => {
  console.error('SMOKE TEST FAILED:', err instanceof Error ? err.stack ?? err.message : err);
  process.exit(1);
});
