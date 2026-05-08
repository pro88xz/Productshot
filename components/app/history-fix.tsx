'use client';

import { useEffect } from 'react';

/**
 * Strips OAuth redirect URLs from browser history after auth completes.
 * Without this, back button on /dashboard would traverse the entire OAuth chain
 * (Google account picker, Supabase callback, etc.) before returning to the site.
 *
 * Renders nothing — pure side effect.
 */
export function HistoryFix() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const ref = document.referrer;
    const cameFromAuth =
      ref.includes('/auth/callback') ||
      ref.includes('accounts.google.com') ||
      ref.includes('supabase.co');

    if (cameFromAuth) {
      // Replace current history entry so back button skips the OAuth chain
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  return null;
}
