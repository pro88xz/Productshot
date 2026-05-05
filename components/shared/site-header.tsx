import Link from 'next/link';
import { Sparkles } from 'lucide-react';

import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/shared/theme-toggle';

export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="border-border/40 bg-background/80 sticky top-0 z-40 w-full border-b backdrop-blur-md">
      <div className="container-prose flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="bg-primary text-primary-foreground flex h-8 w-8 items-center justify-center rounded-lg">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="text-lg">ProductShot</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Main navigation">
          <Link
            href="/#how-it-works"
            className="text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            How it works
          </Link>
          <Link
            href="/#examples"
            className="text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            Examples
          </Link>
          <Link
            href="/#pricing"
            className="text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            Pricing
          </Link>
          <Link
            href="/#faq"
            className="text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            FAQ
          </Link>
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <ThemeToggle />
          {user ? (
            <Button asChild size="sm">
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link href="/sign-in">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/sign-up">Get started</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
