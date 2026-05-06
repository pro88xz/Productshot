import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, Sparkles } from 'lucide-react';

import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { signOutAction } from '@/app/(auth)/actions';
import { PricingClient } from '@/components/app/pricing-client';

export const metadata: Metadata = {
  title: 'Top up credits',
  robots: { index: false, follow: false },
};

export default async function InAppPricingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/sign-in');
  }

  const { data: credits } = await supabase
    .from('credits')
    .select('balance')
    .eq('user_id', user.id)
    .maybeSingle();

  const balance = credits?.balance ?? 0;
  const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? '';

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <div className="border-border/40 bg-background/80 sticky top-0 z-30 border-b backdrop-blur-md">
        <div className="container-prose flex h-16 items-center justify-between">
          <Link
            href="/dashboard"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>

          <div className="flex items-center gap-3">
            <span className="bg-primary/10 text-primary inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium">
              <Sparkles className="h-3.5 w-3.5" />
              {balance} {balance === 1 ? 'credit' : 'credits'}
            </span>
            <form action={signOutAction}>
              <Button type="submit" variant="ghost" size="sm">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </div>

      <div className="container-prose py-10 md:py-14">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Top up credits</h1>
            <p className="text-muted-foreground mt-3 text-base sm:text-lg">
              Pay once, generate when you&apos;re ready. No expiration.
            </p>
          </div>

          <div className="mt-10">
            <PricingClient paypalClientId={paypalClientId} />
          </div>

          <p className="text-muted-foreground mt-12 text-center text-xs">
            Secure payment via PayPal. By purchasing, you agree to our{' '}
            <Link href="/terms" className="text-foreground underline underline-offset-4">
              Terms
            </Link>{' '}
            and{' '}
            <Link href="/refund" className="text-foreground underline underline-offset-4">
              Refund Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
