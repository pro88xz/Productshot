import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronRight, Sparkles } from 'lucide-react';

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

  const { data: recentGenerations } = await supabase
    .from('generations')
    .select('id, status, output_image_urls, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(3);

  const balance = credits?.balance ?? 0;

  return (
    <div className="container-prose py-10 md:py-14">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Dashboard</h1>
            <p className="text-muted-foreground mt-2 text-sm sm:text-base">
              Signed in as {user.email}
            </p>
          </div>

          <form action={signOutAction}>
            <Button type="submit" variant="ghost" size="sm">
              Sign out
            </Button>
          </form>
        </div>

        {/* Credits + primary CTA */}
        <div className="border-primary/30 from-primary/5 to-primary/10 mt-10 rounded-2xl border bg-gradient-to-br p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
                Credits
              </p>
              <p className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">{balance}</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {credits?.lifetime_earned ?? 0} earned · {credits?.lifetime_spent ?? 0} spent
              </p>
            </div>
            <Sparkles className="text-primary h-8 w-8" />
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/generate">
                <Sparkles className="mr-2 h-4 w-4" />
                Generate photos
              </Link>
            </Button>
            {balance < 5 && (
              <Button asChild variant="outline" size="lg">
                <Link href="/pricing">Top up credits</Link>
              </Button>
            )}
          </div>
        </div>

        {/* Recent generations */}
        <div className="mt-10">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xl font-semibold tracking-tight">Recent generations</h2>
            <Link
              href="/history"
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
            >
              See all <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {recentGenerations && recentGenerations.length > 0 ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {recentGenerations.map((gen) => (
                <Link
                  key={gen.id}
                  href={`/history#${gen.id}`}
                  className="border-border/60 bg-card hover:border-border block aspect-square overflow-hidden rounded-xl border transition-colors"
                >
                  {gen.output_image_urls?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={gen.output_image_urls[0]}
                      alt="Generated"
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="text-muted-foreground flex h-full items-center justify-center text-xs">
                      {gen.status}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <div className="border-border/60 from-primary/5 via-card to-card mt-4 flex flex-col items-center rounded-xl border bg-gradient-to-br p-10 text-center">
              <div className="from-primary/15 to-primary/5 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br">
                <Sparkles className="text-primary h-6 w-6" />
              </div>
              <p className="mt-5 text-base font-semibold">Ready when you are</p>
              <p className="text-muted-foreground mt-1.5 max-w-sm text-sm">
                Upload a product photo and we&apos;ll generate a full set of professional shots in
                under a minute.
              </p>
              <Button asChild className="mt-6">
                <Link href="/generate">Generate your first photos</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
