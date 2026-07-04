import Link from 'next/link';
import { ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * VerificationProof — landing page section showcasing the Scaffold verification
 * layer with real live Kimi observations from routing_events.
 *
 * Cached at edge for 60s so we stay fast without going fully static.
 */
export const revalidate = 60;

interface KimiQuote {
  scene_id: string;
  path: string;
  verify_score: number;
  verify_reasoning: string;
  created_at: string;
}

async function loadProof() {
  try {
    const admin = createAdminClient();

    // Grab a handful of recent verified events with substantive Kimi reasoning
    const { data: quotes } = await admin
      .from('routing_events')
      .select('scene_id, path, verify_score, verify_reasoning, created_at')
      .not('verify_reasoning', 'is', null)
      .gte('verify_score', 0.7)
      .order('created_at', { ascending: false })
      .limit(4);

    // Aggregate stats for the pill row
    const { count: totalVerified } = await admin
      .from('routing_events')
      .select('*', { count: 'exact', head: true })
      .not('verify_score', 'is', null);

    const { count: totalFallbacks } = await admin
      .from('routing_events')
      .select('*', { count: 'exact', head: true })
      .eq('was_fallback', true);

    const { count: totalEvents } = await admin
      .from('routing_events')
      .select('*', { count: 'exact', head: true });

    return {
      quotes: (quotes ?? []) as KimiQuote[],
      totalVerified: totalVerified ?? 0,
      totalFallbacks: totalFallbacks ?? 0,
      totalEvents: totalEvents ?? 0,
    };
  } catch {
    return { quotes: [], totalVerified: 0, totalFallbacks: 0, totalEvents: 0 };
  }
}

function trimReasoning(text: string, maxLen = 180): string {
  if (text.length <= maxLen) return text;
  // Cut at last sentence boundary within limit
  const cut = text.slice(0, maxLen);
  const lastPeriod = cut.lastIndexOf('.');
  if (lastPeriod > maxLen * 0.6) return cut.slice(0, lastPeriod + 1);
  return cut.trim() + '…';
}

function humanScene(sceneId: string): string {
  return sceneId
    .split('-')
    .map((s) => s[0].toUpperCase() + s.slice(1))
    .join(' ');
}

export async function VerificationProof() {
  const { quotes, totalVerified, totalFallbacks, totalEvents } = await loadProof();

  const selfHealPct =
    totalEvents > 0 ? Math.round((totalFallbacks / totalEvents) * 100 * 10) / 10 : 0;

  return (
    <section className="border-border/40 border-y bg-gradient-to-b from-background to-muted/20">
      <div className="container-prose py-16 sm:py-24">
        {/* Section header */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="border-border/60 bg-background/60 text-muted-foreground inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium backdrop-blur">
            <ShieldCheck className="text-primary h-3 w-3" />
            <span>The part no one else does</span>
          </div>
          <h2 className="mt-5 text-3xl leading-[1.15] font-semibold tracking-tight text-balance sm:text-4xl md:text-5xl">
            Every photo checked before it reaches you.
          </h2>
          <p className="text-muted-foreground mt-5 text-base text-balance sm:text-lg">
            AI image models sometimes distort products — a buckle changes shape, a
            logo shifts, a bottle grows an extra ring. We use a second AI model to
            catch those failures before you ship them to buyers. When we catch one,
            our system routes around it automatically.
          </p>
        </div>

        {/* Stats pills */}
        {totalEvents > 0 && (
          <div className="mx-auto mt-10 flex max-w-3xl flex-wrap items-center justify-center gap-3 sm:gap-4">
            <StatPill label="Photos verified" value={totalVerified.toLocaleString()} />
            <StatPill
              label="Self-healed retries"
              value={totalFallbacks.toLocaleString()}
            />
            <StatPill label="Self-heal rate" value={`${selfHealPct}%`} />
          </div>
        )}

        {/* Kimi quotes */}
        {quotes.length > 0 && (
          <div className="mx-auto mt-12 grid max-w-5xl gap-4 sm:mt-16 sm:grid-cols-2">
            {quotes.map((q, i) => (
              <div
                key={i}
                className="border-border/60 bg-card group relative overflow-hidden rounded-xl border p-5 shadow-sm transition hover:shadow-md sm:p-6"
              >
                <div className="mb-3 flex items-center gap-2">
                  <CheckCircle2 className="text-primary h-4 w-4" />
                  <div className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
                    {humanScene(q.scene_id)} · {q.path}
                  </div>
                  <div className="text-muted-foreground/70 ml-auto text-xs tabular-nums">
                    verified {Number(q.verify_score).toFixed(2)}
                  </div>
                </div>
                <p className="text-foreground/90 text-sm leading-relaxed">
                  &ldquo;{trimReasoning(q.verify_reasoning)}&rdquo;
                </p>
                <div className="text-muted-foreground/70 mt-3 text-[10px] tracking-widest uppercase">
                  Kimi K2.6 on Fireworks (AMD MI300X)
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CTA to live dashboard */}
        <div className="mx-auto mt-10 flex max-w-3xl flex-col items-center gap-3 sm:mt-14">
          <Link
            href="/routing"
            className="text-primary hover:text-primary/80 inline-flex items-center gap-1.5 text-sm font-medium transition"
          >
            See every routing decision, live
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <p className="text-muted-foreground/70 text-xs">
            Public dashboard. Real telemetry. No filters.
          </p>
        </div>
      </div>
    </section>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-border/60 bg-background/60 flex items-baseline gap-2 rounded-full border px-4 py-2 text-sm backdrop-blur">
      <span className="text-foreground text-base font-semibold tabular-nums sm:text-lg">
        {value}
      </span>
      <span className="text-muted-foreground text-xs sm:text-sm">{label}</span>
    </div>
  );
}
