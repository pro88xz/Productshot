'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Silently re-fetches the server component every N seconds so judges see live data.
 * Displays a small "updated Xs ago" indicator.
 */
export function AutoRefresh({ intervalMs = 30_000 }: { intervalMs?: number }) {
  const router = useRouter();
  const [lastRefresh, setLastRefresh] = useState<number>(Date.now());
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      router.refresh();
      setLastRefresh(Date.now());
    }, intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);

  // Tick every second so "updated Xs ago" counts up smoothly
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const secondsAgo = Math.floor((Date.now() - lastRefresh) / 1000);

  return (
    <div className="flex items-center gap-2 text-xs text-neutral-500 font-mono">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-60"></span>
        <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500"></span>
      </span>
      <span>
        LIVE · refreshes every {intervalMs / 1000}s · last update {secondsAgo}s ago · tick {tick % 60}
      </span>
    </div>
  );
}
