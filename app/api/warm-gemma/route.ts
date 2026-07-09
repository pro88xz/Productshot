import { NextResponse } from 'next/server';
import { after } from 'next/server';

/**
 * Fire-and-forget warm-up ping for the Gemma routing-intelligence deployment.
 * Called client-side when someone lands on a page likely to lead to a real
 * generation (e.g. /try), and by a scheduled external pinger (see
 * .github/workflows/warm-gemma.yml) to keep the deployment warm continuously.
 *
 * Sends a trivial 1-token completion just to trigger Fireworks' scale-up, so
 * the deployment has a head start warming (~90s cold start otherwise).
 *
 * IMPORTANT: the warm-up fetch runs inside after() so Vercel keeps this
 * serverless function alive until it actually completes. Without after(),
 * an un-awaited fetch can be silently cut off the moment the response is
 * sent, meaning the ping never actually reaches Fireworks.
 *
 * Always returns quickly and never throws — this must never block or break
 * the page that calls it. If Gemma routing is disabled or unconfigured, this
 * is a silent no-op.
 */
export async function POST() {
  return handleWarm();
}

// Allow GET too, so a simple scheduled curl/cron ping doesn't need to send a
// POST body or special headers.
export async function GET() {
  return handleWarm();
}

function handleWarm() {
  if (process.env.ENABLE_GEMMA_ROUTING !== 'true') {
    return NextResponse.json({ warmed: false, reason: 'gemma routing disabled' });
  }

  const apiKey = process.env.FIREWORKS_API_KEY;
  const model = process.env.FIREWORKS_GEMMA_MODEL;
  if (!apiKey || !model) {
    return NextResponse.json({ warmed: false, reason: 'not configured' });
  }

  after(async () => {
    try {
      await fetch('https://api.fireworks.ai/inference/v1/chat/completions', {
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
      });
    } catch (err) {
      console.warn('[warm-gemma] background warmup ping failed (non-fatal):', err);
    }
  });

  return NextResponse.json({ warmed: true });
}
