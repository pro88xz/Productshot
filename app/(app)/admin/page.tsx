import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, DollarSign, ImageIcon, Sparkles, TrendingUp, Users } from 'lucide-react';

import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { SCENE_STYLES } from '@/lib/replicate/scenes';

const ADMIN_EMAIL = 'secretsafe.cc@gmail.com';

type AdminStats = {
  total_signups: number;
  total_generations: number;
  completed_generations: number;
  total_revenue_cents: number;
  total_credits_used: number;
};

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email?.toLowerCase() !== ADMIN_EMAIL) {
    redirect('/dashboard');
  }

  // Stats via RPC
  const { data: statsRaw, error: statsError } = await supabase.rpc('get_admin_stats');
  if (statsError) {
    console.error('admin stats error:', statsError);
  }
  const stats = (statsRaw ?? {
    total_signups: 0,
    total_generations: 0,
    completed_generations: 0,
    total_revenue_cents: 0,
    total_credits_used: 0,
  }) as AdminStats;

  // Recent generations (last 20)
  const { data: recentGens } = await supabase
    .from('generations')
    .select('id, created_at, status, scene_styles, credits_used, user_id')
    .order('created_at', { ascending: false })
    .limit(20);

  // Recent payments (last 10)
  const { data: recentPayments } = await supabase
    .from('payments')
    .select('id, created_at, amount_cents, kind, status, user_id, paypal_capture_id')
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(10);

  // Get user emails for recent rows in one shot via admin client
  // (auth.users is gated; we use service-role admin client server-side)
  const { createAdminClient } = await import('@/lib/supabase/admin');
  const admin = createAdminClient();

  const userIds = new Set<string>([
    ...(recentGens ?? []).map((g) => g.user_id),
    ...(recentPayments ?? []).map((p) => p.user_id),
  ]);

  const emailMap = new Map<string, string>();
  for (const uid of userIds) {
    const { data: u } = await admin.auth.admin.getUserById(uid);
    if (u?.user?.email) {
      emailMap.set(uid, u.user.email);
    }
  }

  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const diffMs = now - d.getTime();
    const mins = Math.floor(diffMs / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatScenes = (ids: string[] | null) => {
    if (!ids || ids.length === 0) return '—';
    return ids.map((id) => SCENE_STYLES.find((s) => s.id === id)?.name ?? id).join(', ');
  };

  const dollars = (cents: number) =>
    (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

  return (
    <div className="bg-background min-h-screen">
      <div className="container-prose pt-6 pb-16 sm:pt-8 sm:pb-20">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
              <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
                <span>Back to dashboard</span>
              </Link>
            </Button>
            <p className="text-primary text-xs font-medium tracking-widest uppercase">Admin</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
              ProductShot dashboard
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Read-only view of signups, revenue, and recent activity.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
          <StatCard
            icon={<Users className="h-4 w-4" />}
            label="Signups"
            value={stats.total_signups.toLocaleString()}
          />
          <StatCard
            icon={<DollarSign className="h-4 w-4" />}
            label="Revenue"
            value={dollars(stats.total_revenue_cents)}
            highlight
          />
          <StatCard
            icon={<ImageIcon className="h-4 w-4" />}
            label="Generations"
            value={stats.total_generations.toLocaleString()}
          />
          <StatCard
            icon={<TrendingUp className="h-4 w-4" />}
            label="Completed"
            value={stats.completed_generations.toLocaleString()}
          />
          <StatCard
            icon={<Sparkles className="h-4 w-4" />}
            label="Credits used"
            value={stats.total_credits_used.toLocaleString()}
          />
        </div>

        {/* Recent generations */}
        <section className="mt-10">
          <h2 className="text-lg font-semibold">Recent generations</h2>
          <p className="text-muted-foreground mt-1 text-sm">Last 20 across all users.</p>
          <div className="border-border/60 bg-card mt-4 overflow-hidden rounded-xl border">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-muted-foreground text-xs tracking-wider uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">User</th>
                    <th className="px-4 py-3 text-left font-medium">Scenes</th>
                    <th className="px-4 py-3 text-left font-medium">Credits</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-left font-medium">When</th>
                  </tr>
                </thead>
                <tbody className="divide-border/40 divide-y">
                  {(recentGens ?? []).length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="text-muted-foreground px-4 py-8 text-center text-sm"
                      >
                        No generations yet.
                      </td>
                    </tr>
                  ) : (
                    (recentGens ?? []).map((g) => (
                      <tr key={g.id}>
                        <td className="px-4 py-3 font-mono text-xs">
                          {emailMap.get(g.user_id) ?? `${g.user_id.slice(0, 8)}…`}
                        </td>
                        <td className="px-4 py-3">{formatScenes(g.scene_styles as string[])}</td>
                        <td className="px-4 py-3">{g.credits_used}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={g.status} />
                        </td>
                        <td className="text-muted-foreground px-4 py-3 text-xs">
                          {formatTime(g.created_at)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Recent payments */}
        <section className="mt-10">
          <h2 className="text-lg font-semibold">Recent payments</h2>
          <p className="text-muted-foreground mt-1 text-sm">Last 10 completed payments.</p>
          <div className="border-border/60 bg-card mt-4 overflow-hidden rounded-xl border">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-muted-foreground text-xs tracking-wider uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">User</th>
                    <th className="px-4 py-3 text-left font-medium">Plan</th>
                    <th className="px-4 py-3 text-left font-medium">Amount</th>
                    <th className="px-4 py-3 text-left font-medium">Capture ID</th>
                    <th className="px-4 py-3 text-left font-medium">When</th>
                  </tr>
                </thead>
                <tbody className="divide-border/40 divide-y">
                  {(recentPayments ?? []).length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="text-muted-foreground px-4 py-8 text-center text-sm"
                      >
                        No payments yet.
                      </td>
                    </tr>
                  ) : (
                    (recentPayments ?? []).map((p) => (
                      <tr key={p.id}>
                        <td className="px-4 py-3 font-mono text-xs">
                          {emailMap.get(p.user_id) ?? `${p.user_id.slice(0, 8)}…`}
                        </td>
                        <td className="px-4 py-3 capitalize">{p.kind}</td>
                        <td className="px-4 py-3 font-medium">{dollars(p.amount_cents)}</td>
                        <td className="text-muted-foreground px-4 py-3 font-mono text-xs">
                          {p.paypal_capture_id ? `${p.paypal_capture_id.slice(0, 14)}…` : '—'}
                        </td>
                        <td className="text-muted-foreground px-4 py-3 text-xs">
                          {formatTime(p.created_at)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

// ----- Sub-components -----

function StatCard({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`border-border/60 rounded-xl border p-4 ${
        highlight ? 'from-primary/5 to-card bg-gradient-to-br' : 'bg-card'
      }`}
    >
      <div className="text-muted-foreground flex items-center gap-1.5">
        {icon}
        <span className="text-xs font-medium tracking-wider uppercase">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    completed: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    pending: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
    failed: 'bg-rose-500/10 text-rose-700 dark:text-rose-400',
  };
  const cls = styles[status] ?? 'bg-muted text-muted-foreground';
  return <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${cls}`}>{status}</span>;
}
