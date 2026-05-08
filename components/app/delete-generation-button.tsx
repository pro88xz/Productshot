'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';

type DeleteGenerationButtonProps = {
  generationId: string;
};

export function DeleteGenerationButton({ generationId }: DeleteGenerationButtonProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = () => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/generation/${generationId}`, { method: 'DELETE' });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error ?? 'Delete failed');
          return;
        }
        // Refresh server data — the deleted row will disappear from history
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Delete failed');
      }
    });
  };

  if (!confirming) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setConfirming(true)}
        className="text-muted-foreground hover:text-destructive shrink-0"
        aria-label="Delete generation"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {error ? (
        <span className="text-destructive text-xs">{error}</span>
      ) : (
        <span className="text-muted-foreground text-xs">Delete?</span>
      )}
      <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isPending}>
        {isPending && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />}
        Yes
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          setConfirming(false);
          setError(null);
        }}
        disabled={isPending}
      >
        Cancel
      </Button>
    </div>
  );
}
