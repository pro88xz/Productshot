'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Star } from 'lucide-react';

import { Button } from '@/components/ui/button';

type FeatureToggleButtonProps = {
  generationId: string;
  initialFeatured: boolean;
};

export function FeatureToggleButton({ generationId, initialFeatured }: FeatureToggleButtonProps) {
  const router = useRouter();
  const [isFeatured, setIsFeatured] = useState(initialFeatured);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleToggle = () => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/generation/${generationId}/feature`, { method: 'POST' });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error ?? 'Toggle failed');
          return;
        }
        const data = await res.json();
        setIsFeatured(Boolean(data?.is_featured));
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Toggle failed');
      }
    });
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleToggle}
      disabled={isPending}
      className={`shrink-0 ${
        isFeatured
          ? 'text-amber-500 hover:text-amber-600'
          : 'text-muted-foreground hover:text-foreground'
      }`}
      aria-label={isFeatured ? 'Unfeature from homepage' : 'Feature on homepage'}
      title={error ?? (isFeatured ? 'Featured on homepage' : 'Feature on homepage')}
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Star className={`h-4 w-4 ${isFeatured ? 'fill-amber-500' : ''}`} />
      )}
    </Button>
  );
}
