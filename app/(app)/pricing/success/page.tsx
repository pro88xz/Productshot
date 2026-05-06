import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CheckCircle2, Sparkles } from 'lucide-react';

import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Payment successful',
  robots: { index: false, follow: false },
};

export default async function PaymentSuccessPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/sign-in');
  }

  const { data: credits } = await supabase
    .from('credits')
    .select('balance, lifetime_earned')
    .eq('user_id', user.id)
    .maybeSingle();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md text-center">
        <div className="bg-primary/10 text-primary mx-auto flex h-16 w-16 items-center justify-center rounded-full">
          <CheckCircle2 className="h-8 w-8" />
        </div>

        <h1 className="mt-6 text-3xl font-semibold tracking-tight">Payment successful</h1>
        <p className="text-muted-foreground mt-3 text-sm">
          Your credits are ready to use. Generate your next set of photos in under a minute.
        </p>

        <div className="border-primary/30 from-primary/5 to-primary/10 mt-8 rounded-2xl border bg-gradient-to-br p-6">
          <p className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
            Credits
          </p>
          <div className="mt-2 flex items-center justify-center gap-2">
            <Sparkles className="text-primary h-6 w-6" />
            <p className="text-4xl font-semibold tracking-tight">{credits?.balance ?? 0}</p>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild size="lg">
            <Link href="/generate">Generate photos</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/dashboard">Dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
