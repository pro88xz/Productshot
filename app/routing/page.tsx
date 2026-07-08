import type { Metadata } from 'next';
import Link from 'next/link';
import { AutoRefresh } from '@/components/routing/auto-refresh';
import { createAdminClient } from '@/lib/supabase/admin';

export const metadata: Metadata = {
  title: 'Scaffold Routing · Live',
  description:
    'Live routing telemetry from Scaffold — the compound AI system powering ProductShot generations.',
  robots: { index: false, follow: false },
};

// Don't cache — we want fresh numbers on every request
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface EventRow {
  id: string;
  created_at: string;
  scene_id: string;
  path: 'compose' | 'edit';
  tier: string;
  cost_usd: number;
  latency_ms: number;
  verify_score: number | null;
  verify_reasoning: string | null;
  verify_passed: boolean | null;
  was_fallback: boolean;
  total_cost_usd: number;
  gemma_recommended_path: 'compose' | 'edit' | null;
  gemma_confidence: number | null;
  gemma_reasoning: string | null;
  gemma_product_category: string | null;
  gemma_used_fallback: boolean | null;
  gemma_overrode_static: boolean | null;
}

interface PathStats {
  path: string;
  count: number;
  avgCost: number;
  avgLatency: number;
  avgScore: number | null;
  totalCost: number;
}

interface GemmaStats {
  totalCalls: number;
  liveDecisions: number; // calls where Gemma actually reasoned (not disabled/error fallback)
  overrideCount: number;
  avgConfidence: number | null;
  totalCost: number;
}

async function loadData() {
  const admin = createAdminClient();

  const { data: events, error } = await admin
    .from('routing_events')
    .select(
      'id, created_at, scene_id, path, tier, cost_usd, latency_ms, verify_score, verify_reasoning, verify_passed, was_fallback, total_cost_usd, gemma_recommended_path, gemma_confidence, gemma_reasoning, gemma_product_category, gemma_used_fallback, gemma_overrode_static',
    )
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    console.error('[routing] query failed:', error.message);
    return {
      events: [] as EventRow[],
      error: error.message,
    };
  }

  return { events: (events ?? []) as EventRow[], error: null };
}

function pathStats(events: EventRow[], path: string): PathStats {
  const rows = events.filter((e) => e.path === path);
  const count = rows.length;
  if (count === 0) {
    return { path, count: 0, avgCost: 0, avgLatency: 0, avgScore: null, totalCost: 0 };
  }
  const avgCost = rows.reduce((s, r) => s + Number(r.cost_usd), 0) / count;
  const avgLatency = rows.reduce((s, r) => s + Number(r.latency_ms), 0) / count;
  const scored = rows.filter((r) => r.verify_score !== null);
  const avgScore = scored.length
    ? scored.reduce((s, r) => s + Number(r.verify_score), 0) / scored.length
    : null;
  const totalCost = rows.reduce((s, r) => s + Number(r.total_cost_usd), 0);
  return { path, count, avgCost, avgLatency, avgScore, totalCost };
}

function gemmaStats(events: EventRow[]): GemmaStats {
  // "Live decision" = Gemma actually returned a reasoned recommendation,
  // i.e. it wasn't disabled/misconfigured/erroring (gemma_confidence not null
  // and not the synthetic 0 used for hard-failure fallbacks with no reasoning).
  const withGemma = events.filter((e) => e.gemma_confidence !== null);
  const liveDecisions = withGemma.filter(
    (e) => e.gemma_used_fallback === false || e.gemma_overrode_static === true,
  );
  const overrideCount = events.filter((e) => e.gemma_overrode_static === true).length;
  const avgConfidence = withGemma.length
    ? withGemma.reduce((s, e) => s + Number(e.gemma_confidence), 0) / withGemma.length
    : null;

  return {
    totalCalls: withGemma.length,
    liveDecisions: liveDecisions.length,
    overrideCount,
    avgConfidence,
    totalCost: 0, // computed separately below from gemma_cost_usd sum if needed later
  };
}

function formatMoney(n: number, digits = 4): string {
  return '$' + n.toFixed(digits);
}

function formatMs(n: number): string {
  return (n / 1000).toFixed(1) + 's';
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

// -------- Score distribution (10 buckets: 0.0-0.1, 0.1-0.2, ..., 0.9-1.0) --------
function scoreDistribution(events: EventRow[]): number[] {
  const buckets = new Array(10).fill(0);
  for (const e of events) {
    if (e.verify_score === null) continue;
    const idx = Math.min(9, Math.max(0, Math.floor(Number(e.verify_score) * 10)));
    buckets[idx]++;
  }
  return buckets;
}

export default async function RoutingDashboardPage() {
  const { events, error } = await loadData();

  const compose = pathStats(events, 'compose');
  const edit = pathStats(events, 'edit');
  const gemma = gemmaStats(events);

  const totalEvents = events.length;
  const totalCost = events.reduce((s, e) => s + Number(e.total_cost_usd), 0);

  // Fallback (self-healing) rate — % of events that were the retry after a failed edit
  const fallbackCount = events.filter((e) => e.was_fallback).length;
  const fallbackRate = totalEvents > 0 ? (fallbackCount / totalEvents) * 100 : 0;

  // Savings: hypothetical cost if ALL events had used the edit path
  const hypotheticalAllEditCost = totalEvents * 0.04;
  const savedCost = Math.max(0, hypotheticalAllEditCost - totalCost);
  const savedPct = hypotheticalAllEditCost > 0 ? (savedCost / hypotheticalAllEditCost) * 100 : 0;

  const scoreDist = scoreDistribution(events);
  const maxDist = Math.max(1, ...scoreDist);

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0a1120] to-[#050810] text-neutral-100 font-mono">
      {/* HEADER */}
      <div className="border-b border-neutral-800/60 bg-black/30 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6 py-6">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                SCAFFOLD <span className="text-amber-500">·</span> ROUTING
              </h1>
              <p className="text-sm text-neutral-400 mt-1">
                Compound AI inference telemetry · live from Supabase{' '}
                <span className="text-amber-500">routing_events</span>
              </p>
            </div>
            <AutoRefresh intervalMs={30_000} />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-8 space-y-8">
        {error && (
          <div className="rounded border border-red-800/50 bg-red-950/30 p-4 text-sm text-red-300">
            Query error: {error}
          </div>
        )}

        {/* HERO NUMBERS */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="EVENTS ROUTED"
            value={totalEvents.toString()}
            hint="last 200 decisions"
          />
          <StatCard
            label="CUMULATIVE COST"
            value={formatMoney(totalCost, 4)}
            hint="all providers"
          />
          <StatCard
            label="SAVED vs. EDIT-ONLY"
            value={formatMoney(savedCost, 4)}
            hint={`${savedPct.toFixed(0)}% cheaper than baseline`}
            highlight
          />
          <StatCard
            label="SELF-HEAL RATE"
            value={fallbackRate.toFixed(1) + '%'}
            hint={`${fallbackCount} retries fired`}
          />
        </section>

        {/* GEMMA ROUTING INTELLIGENCE */}
        <section>
          <h2 className="text-xs uppercase tracking-widest text-neutral-500 mb-3">
            gemma routing intelligence · Gemma 3 4B (Fireworks)
          </h2>
          <div className="rounded border border-emerald-500/30 bg-emerald-500/[0.03] p-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-[10px] uppercase text-neutral-500">gemma calls</div>
                <div className="tabular-nums text-white text-lg">{gemma.totalCalls}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-neutral-500">live decisions</div>
                <div className="tabular-nums text-emerald-400 text-lg">
                  {gemma.liveDecisions}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-neutral-500">path overrides</div>
                <div className="tabular-nums text-amber-400 text-lg">
                  {gemma.overrideCount}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-neutral-500">avg confidence</div>
                <div className="tabular-nums text-white text-lg">
                  {gemma.avgConfidence === null ? '—' : gemma.avgConfidence.toFixed(2)}
                </div>
              </div>
            </div>
            <p className="mt-4 text-[11px] text-neutral-500 leading-relaxed">
              Before every routed generation, Gemma reasons over the product and scene to
              recommend edit vs. compose — catching high-risk products (reflective, transparent,
              logo-heavy) before an expensive edit-path attempt is wasted on one likely to fail
              verification. Falls back to the static scene default whenever Gemma is
              unavailable or under-confident, so routing never breaks.
            </p>
          </div>
        </section>

        {/* PATH COMPARISON */}
        <section>
          <h2 className="text-xs uppercase tracking-widest text-neutral-500 mb-3">
            path breakdown
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PathCard stats={compose} label="COMPOSE" hint="rembg + FLUX Schnell + sharp" />
            <PathCard stats={edit} label="EDIT" hint="FLUX Kontext Pro (Replicate)" />
          </div>
        </section>

        {/* VERIFICATION SCORE DISTRIBUTION */}
        <section>
          <h2 className="text-xs uppercase tracking-widest text-neutral-500 mb-3">
            verification score distribution · Kimi K2.6 (Fireworks)
          </h2>
          <div className="rounded border border-neutral-800 bg-black/40 p-6">
            <div className="grid grid-cols-10 gap-1 items-end h-32">
              {scoreDist.map((count, i) => {
                const heightPct = (count / maxDist) * 100;
                const bucketMin = (i / 10).toFixed(1);
                const isPassing = i >= 7;
                return (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <div
                      className={`w-full rounded-sm transition-all ${
                        isPassing ? 'bg-amber-500' : 'bg-neutral-700'
                      }`}
                      style={{ height: `${Math.max(2, heightPct)}%` }}
                      title={`${bucketMin}-${((i + 1) / 10).toFixed(1)}: ${count} events`}
                    />
                    <span className="text-[10px] text-neutral-600">{bucketMin}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex justify-between text-[10px] text-neutral-500">
              <span>0.0 (different product)</span>
              <span>0.72 (pass threshold) →</span>
              <span>1.0 (pixel-identical)</span>
            </div>
          </div>
        </section>

        {/* RECENT EVENTS TABLE */}
        <section>
          <h2 className="text-xs uppercase tracking-widest text-neutral-500 mb-3">
            recent events · latest 20
          </h2>
          <div className="rounded border border-neutral-800 bg-black/40 overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-neutral-500 border-b border-neutral-800">
                <tr>
                  <th className="text-left px-3 py-2 font-normal">time</th>
                  <th className="text-left px-3 py-2 font-normal">scene</th>
                  <th className="text-left px-3 py-2 font-normal">path</th>
                  <th className="text-right px-3 py-2 font-normal">cost</th>
                  <th className="text-right px-3 py-2 font-normal">latency</th>
                  <th className="text-right px-3 py-2 font-normal">verify</th>
                  <th className="text-left px-3 py-2 font-normal">gemma</th>
                  <th className="text-left px-3 py-2 font-normal">kimi note</th>
                </tr>
              </thead>
              <tbody>
                {events.slice(0, 20).map((e) => {
                  const scoreCol =
                    e.verify_score === null
                      ? 'text-neutral-600'
                      : Number(e.verify_score) >= 0.72
                        ? 'text-emerald-400'
                        : 'text-red-400';
                  return (
                    <tr
                      key={e.id}
                      className="border-b border-neutral-900/60 last:border-b-0 hover:bg-neutral-900/40"
                    >
                      <td className="px-3 py-2 text-neutral-400">{fmtTime(e.created_at)}</td>
                      <td className="px-3 py-2">{e.scene_id}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-[10px] ${
                            e.path === 'compose'
                              ? 'bg-amber-500/10 text-amber-400'
                              : 'bg-blue-500/10 text-blue-300'
                          }`}
                        >
                          {e.path}
                        </span>
                        {e.was_fallback && (
                          <span className="ml-1 rounded px-1 py-0.5 text-[10px] bg-purple-500/10 text-purple-300">
                            fallback
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatMoney(Number(e.cost_usd), 4)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-neutral-400">
                        {formatMs(Number(e.latency_ms))}
                      </td>
                      <td className={`px-3 py-2 text-right tabular-nums ${scoreCol}`}>
                        {e.verify_score === null
                          ? '—'
                          : Number(e.verify_score).toFixed(2)}
                      </td>
                      <td className="px-3 py-2 max-w-[220px]">
                        {e.gemma_confidence === null ? (
                          <span className="text-neutral-700">—</span>
                        ) : (
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1">
                              <span
                                className={`inline-block rounded px-1.5 py-0.5 text-[10px] ${
                                  e.gemma_overrode_static
                                    ? 'bg-emerald-500/10 text-emerald-400'
                                    : 'bg-neutral-800 text-neutral-500'
                                }`}
                              >
                                {e.gemma_overrode_static ? 'overrode' : 'agreed'}
                              </span>
                              <span className="text-neutral-500 tabular-nums text-[10px]">
                                {Number(e.gemma_confidence).toFixed(2)}
                              </span>
                            </div>
                            {e.gemma_product_category && (
                              <span className="text-neutral-500 truncate">
                                {e.gemma_product_category}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-neutral-400 max-w-xs truncate">
                        {e.verify_reasoning?.slice(0, 80) ?? ''}
                      </td>
                    </tr>
                  );
                })}
                {events.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-neutral-600">
                      no events yet — trigger a generation to populate this table
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="text-center pt-8 pb-4 text-xs text-neutral-600">
          <div>
            scaffold · compound AI inference · Replicate + Fireworks + Supabase
          </div>
          <div className="mt-1">
            <Link href="/" className="hover:text-amber-500">
              ← productshot.com
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}

// -------- Sub-components (server-side) --------

function StatCard({
  label,
  value,
  hint,
  highlight,
}: {
  label: string;
  value: string;
  hint?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded border p-4 ${
        highlight
          ? 'border-amber-500/40 bg-amber-500/5'
          : 'border-neutral-800 bg-black/40'
      }`}
    >
      <div className="text-[10px] uppercase tracking-widest text-neutral-500">{label}</div>
      <div
        className={`mt-1 text-2xl tabular-nums ${
          highlight ? 'text-amber-400' : 'text-white'
        }`}
      >
        {value}
      </div>
      {hint && <div className="mt-1 text-[11px] text-neutral-500">{hint}</div>}
    </div>
  );
}

function PathCard({
  stats,
  label,
  hint,
}: {
  stats: PathStats;
  label: string;
  hint: string;
}) {
  const accent = label === 'COMPOSE' ? 'text-amber-400' : 'text-blue-300';
  return (
    <div className="rounded border border-neutral-800 bg-black/40 p-5">
      <div className="flex items-baseline justify-between">
        <div className={`text-sm font-bold tracking-wider ${accent}`}>{label}</div>
        <div className="text-xs text-neutral-500">{hint}</div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-[10px] uppercase text-neutral-500">events</div>
          <div className="tabular-nums text-white text-lg">{stats.count}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase text-neutral-500">avg cost</div>
          <div className="tabular-nums text-white text-lg">
            {formatMoney(stats.avgCost, 4)}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase text-neutral-500">avg latency</div>
          <div className="tabular-nums text-white text-lg">{formatMs(stats.avgLatency)}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase text-neutral-500">avg verify score</div>
          <div className="tabular-nums text-white text-lg">
            {stats.avgScore === null ? '—' : stats.avgScore.toFixed(3)}
          </div>
        </div>
      </div>
    </div>
  );
}