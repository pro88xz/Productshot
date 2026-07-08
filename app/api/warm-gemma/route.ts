import { NextResponse } from 'next/server';

/**
 * Fire-and-forget warm-up ping for the Gemma routing-intelligence deployment.
 * Called client-side when someone lands on a page likely to lead to a real
 * generation (e.g. /try). Sends a trivial 1-token completion just to trigger
 * Fireworks' scale-up, so the deployment has a head start warming before the
 * visitor actually clicks generate (~90s cold start otherwise).
 *
 * Always returns quickly and never throws — this must never block or break
 * the page that calls it. If Gemma routing is disabled or unconfigured, this
 * is a silent no-op.
 */
export async function POST() {
  if (process.env.ENABLE_GEMMA_ROUTING !== 'true') {
    return NextResponse.json({ warmed: false, reason: 'gemma routing disabled' });
  }

  const apiKey = process.env.FIREWORKS_API_KEY;
  const model = process.env.FIREWORKS_GEMMA_MODEL;
  if (!apiKey || !model) {
    return NextResponse.json({ warmed: false, reason: 'not configured' });
  }

  // Don't await the full completion — just kick off the request so Fireworks
  // starts scaling the replica, and respond to the client immediately.
  fetch('https://api.fireworks.ai/inference/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: 'ping' }],
      max_tokens: 1,
    }),
  }).catch((err) => {
    console.warn('[warm-gemma] background warmup ping failed (non-fatal):', err);
  });

  return NextResponse.json({ warmed: true });
}
