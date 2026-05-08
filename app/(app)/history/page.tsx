import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, Sparkles } from 'lucide-react';

import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { DeleteGenerationButton } from '@/components/app/delete-generation-button';
import { FeatureToggleButton } from '@/components/app/feature-toggle-button';
import { signOutAction } from '@/app/(auth)/actions';
import { SCENE_STYLES } from '@/lib/replicate/scenes';

export const metadata: Metadata = {
  title: 'Generation history',
  robots: { index: false, follow: false },
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function HistoryPage() {
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

  const { data: generations } = await supabase
    .from('generations')
    .select(
      'id, status, output_image_urls, scene_styles, credits_used, created_at, completed_at, is_featured',
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  const isAdmin = user.email?.toLowerCase() === 'secretsafe.cc@gmail.com';
  const balance = credits?.balance ?? 0;

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
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Generation history</h1>
          <p className="text-muted-foreground mt-2">
            All your past generations. Click any photo to download.
          </p>

          {!generations || generations.length === 0 ? (
            <div className="border-border/60 from-primary/5 via-card to-card mt-10 flex flex-col items-center rounded-xl border bg-gradient-to-br p-12 text-center">
              <div className="from-primary/15 to-primary/5 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br">
                <Sparkles className="text-primary h-6 w-6" />
              </div>
              <p className="mt-5 text-base font-semibold">Nothing here yet</p>
              <p className="text-muted-foreground mt-1.5 max-w-sm text-sm">
                Your generated photos will land here. Each one stays for re-download anytime.
              </p>
              <Button asChild className="mt-6">
                <Link href="/generate">Generate your first photos</Link>
              </Button>
            </div>
          ) : (
            <div className="mt-10 space-y-12">
              {generations.map((gen) => {
                const sceneNames = (gen.scene_styles as string[])
                  .map((id) => SCENE_STYLES.find((s) => s.id === id)?.name ?? id)
                  .join(' · ');

                const outputs = (gen.output_image_urls as string[]) ?? [];

                return (
                  <section key={gen.id} id={gen.id}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{sceneNames || 'Generation'}</p>
                        <p className="text-muted-foreground text-xs">
                          {formatDate(gen.created_at)} · {gen.credits_used}{' '}
                          {gen.credits_used === 1 ? 'credit' : 'credits'}
                          {gen.status !== 'completed' && (
                            <>
                              {' '}
                              · <span className="text-destructive">{gen.status}</span>
                            </>
                          )}
                        </p>
                      </div>
                      {isAdmin && (
                        <FeatureToggleButton
                          generationId={gen.id}
                          initialFeatured={Boolean(gen.is_featured)}
                        />
                      )}
                      <DeleteGenerationButton generationId={gen.id} />
                    </div>

                    {outputs.length > 0 ? (
                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                        {outputs.map((url, i) => (
                          <a
                            key={i}
                            href={`${url}?download=1`}
                            className="group bg-muted/40 relative block aspect-square overflow-hidden rounded-xl"
                            aria-label={`Download photo ${i + 1}`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={url}
                              alt={`Generated photo ${i + 1}`}
                              className="h-full w-full object-cover transition-transform group-hover:scale-105"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 flex items-end justify-end bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                              <span className="text-foreground inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-xs font-medium">
                                Download
                              </span>
                            </div>
                          </a>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground mt-3 text-sm italic">
                        No output images for this generation.
                      </p>
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
