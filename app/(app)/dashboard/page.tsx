import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { signOutAction } from '@/app/(auth)/actions';

export const metadata: Metadata = {
  title: 'Dashboard',
  robots: { index: false, follow: false },
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/sign-in');
  }

  const { data: credits } = await supabase
    .from('credits')
    .select('balance, lifetime_earned, lifetime_spent')
    .eq('user_id', user.id)
    .maybeSingle();

  return (
    <div className="container-prose py-12 md:py-16">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Dashboard</h1>
            <p className="text-muted-foreground mt-2">Signed in as {user.email}</p>
          </div>

          <form action={signOutAction}>
            <Button type="submit" variant="ghost" size="sm">
              Sign out
            </Button>
          </form>
        </div>

        <div className="border-border/60 bg-card mt-10 rounded-xl border p-6">
          <p className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
            Credits
          </p>
          <p className="mt-2 text-4xl font-semibold tracking-tight">{credits?.balance ?? 0}</p>
          <p className="text-muted-foreground mt-1 text-sm">
            {credits?.lifetime_earned ?? 0} earned · {credits?.lifetime_spent ?? 0} spent
          </p>
        </div>

        <div className="border-border/60 bg-muted/30 mt-6 rounded-xl border p-6">
          <p className="text-sm">
            The generation feature ships next. For now, this confirms your account works and your 3
            free credits are sitting safely in the database.
          </p>
        </div>
      </div>
    </div>
  );
}
