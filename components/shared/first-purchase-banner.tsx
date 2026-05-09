'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sparkles, X } from 'lucide-react';

const STORAGE_KEY = 'first_purchase_banner_dismissed';

type FirstPurchaseBannerProps = {
  /**
   * If undefined, user is signed-out (banner is generic marketing).
   * If true, user is signed-in but hasn't purchased yet (banner is bonus offer).
   * If false, user has purchased — banner does NOT render.
   */
  hasUserPurchased?: boolean;
};

export function FirstPurchaseBanner({ hasUserPurchased }: FirstPurchaseBannerProps) {
  const [dismissed, setDismissed] = useState<boolean | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isDismissed = sessionStorage.getItem(STORAGE_KEY) === '1';
    setDismissed(isDismissed);
    // Trigger slide-down on next frame so the transition runs
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Don't render anything until we know the dismissal state (avoids hydration mismatch + flash)
  if (dismissed === null) return null;

  // Hide if dismissed
  if (dismissed) return null;

  // Hide if user has already purchased
  if (hasUserPurchased === true) return null;

  const handleDismiss = () => {
    sessionStorage.setItem(STORAGE_KEY, '1');
    setDismissed(true);
  };

  return (
    <div className={`bg-primary text-primary-foreground relative transition-transform duration-500 ease-out ${mounted ? 'translate-y-0' : '-translate-y-full'}`}>
      <div className="container-prose flex items-center justify-center gap-2 py-2 text-sm sm:text-[0.95rem]">
        <Sparkles className="h-4 w-4 shrink-0 animate-pulse" aria-hidden="true" />
        <span className="text-center">
          <span className="hidden sm:inline">First-time customer? </span>
          Get <strong>5 bonus credits</strong> on any pack.{' '}
          <Link
            href={hasUserPurchased === undefined ? '/sign-up' : '/pricing'}
            className="underline underline-offset-2 hover:opacity-90"
          >
            {hasUserPurchased === undefined ? 'Sign up' : 'Top up'} →
          </Link>
        </span>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss banner"
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 opacity-70 hover:opacity-100"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
