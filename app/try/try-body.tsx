'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Upload, Sparkles, Download, X, ArrowRight, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';

const GUEST_SCENE_ID = 'studio-white';

type Stage = 'idle' | 'uploading' | 'generating' | 'ready' | 'error';

interface RoutingMeta {
  path: string;
  tier: string;
  cost_usd: number;
  latency_ms: number;
  verify_score: number | null;
  verify_passed: boolean | null;
}

export function TryBody() {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);

  const [stage, setStage] = useState<Stage>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sourcePreview, setSourcePreview] = useState<string | null>(null);
  const [resultDataUri, setResultDataUri] = useState<string | null>(null);
  const [routingMeta, setRoutingMeta] = useState<RoutingMeta | null>(null);
  const [showSignupModal, setShowSignupModal] = useState(false);

  async function handleFile(file: File) {
    setErrorMsg(null);

    const reader = new FileReader();
    reader.onload = () => setSourcePreview(reader.result as string);
    reader.readAsDataURL(file);

    setStage('uploading');
    try {
      const form = new FormData();
      form.append('file', file);
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: form,
      });
      if (!uploadRes.ok) {
        const body = await uploadRes.json().catch(() => ({}));
        throw new Error(body.error ?? `Upload failed: ${uploadRes.status}`);
      }
      const { url: uploadedUrl } = await uploadRes.json();

      setStage('generating');
      const genRes = await fetch('/api/guest/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_image_url: uploadedUrl,
          scene_style_id: GUEST_SCENE_ID,
        }),
      });
      const genBody = await genRes.json();
      if (!genRes.ok) {
        throw new Error(genBody.error ?? `Generation failed: ${genRes.status}`);
      }

      setResultDataUri(genBody.image_data_uri);
      setRoutingMeta(genBody.routing_meta);
      setStage('ready');
    } catch (err) {
      console.error('[/try] generation failed:', err);
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong.');
      setStage('error');
    }
  }

  function reset() {
    setStage('idle');
    setErrorMsg(null);
    setSourcePreview(null);
    setResultDataUri(null);
    setRoutingMeta(null);
    setShowSignupModal(false);
    if (fileInput.current) fileInput.current.value = '';
  }

  function onDownloadClick() {
    setShowSignupModal(true);
  }

  function goToSignup() {
    router.push('/sign-up');
  }

  return (
    <>
      <section className="container-prose py-12 sm:py-16 md:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <div className="border-border/60 bg-background/60 text-muted-foreground inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium backdrop-blur">
            <Sparkles className="text-primary h-3 w-3" />
            <span>Free demo · No signup required</span>
          </div>
          <h1 className="mt-5 text-3xl leading-[1.1] font-semibold tracking-tight text-balance sm:mt-6 sm:text-4xl md:text-5xl">
            Try it in 60 seconds.
          </h1>
          <p className="text-muted-foreground mt-4 text-base text-balance sm:mt-5 sm:text-lg">
            Upload one product photo. We&apos;ll turn it into a{' '}
            <span className="text-foreground font-medium">Studio White</span> shot,
            verified by our AI. See exactly what you&apos;d get.
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-4xl sm:mt-14">
          {stage === 'idle' && (
            <UploadZone onFile={handleFile} fileInputRef={fileInput} />
          )}

          {stage === 'uploading' && (
            <StatusPanel
              title="Uploading your photo…"
              subtitle="This takes a second or two."
              preview={sourcePreview}
            />
          )}

          {stage === 'generating' && (
            <StatusPanel
              title="Generating your Studio White shot…"
              subtitle="Removing the background. Compositing. Verifying with Kimi K2.6."
              preview={sourcePreview}
            />
          )}

          {stage === 'ready' && resultDataUri && (
            <ResultPanel
              sourcePreview={sourcePreview}
              resultDataUri={resultDataUri}
              routingMeta={routingMeta}
              onDownload={onDownloadClick}
              onTryAnother={reset}
            />
          )}

          {stage === 'error' && <ErrorPanel error={errorMsg} onRetry={reset} />}
        </div>

        <div className="mx-auto mt-12 max-w-3xl text-center sm:mt-16">
          <p className="text-muted-foreground text-sm">
            Every photo verified against your original. See{' '}
            <Link href="/routing" className="text-primary hover:underline">
              live routing telemetry
            </Link>
            .
          </p>
        </div>
      </section>

      {showSignupModal && (
        <SignupModal
          onClose={() => setShowSignupModal(false)}
          onSignup={goToSignup}
        />
      )}
    </>
  );
}

function UploadZone({
  onFile,
  fileInputRef,
}: {
  onFile: (file: File) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) onFile(f);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f && f.type.startsWith('image/')) onFile(f);
  }

  return (
    <div
      onDrop={onDrop}
      onDragOver={(e) => e.preventDefault()}
      className="border-border/60 hover:border-primary/60 hover:bg-primary/5 relative cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition sm:p-16"
      onClick={() => fileInputRef.current?.click()}
    >
      <div className="bg-primary/10 text-primary mx-auto flex h-14 w-14 items-center justify-center rounded-full sm:h-16 sm:w-16">
        <Upload className="h-6 w-6 sm:h-7 sm:w-7" />
      </div>
      <h3 className="mt-5 text-lg font-semibold sm:text-xl">
        Drop your product photo
      </h3>
      <p className="text-muted-foreground mt-2 text-sm sm:text-base">
        Or click anywhere in this box to browse. JPG or PNG works.
      </p>
      <p className="text-muted-foreground/60 mt-4 text-xs">
        For best results: shoot your product clearly, in daylight, with any background.
      </p>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={onChange}
        className="hidden"
      />
    </div>
  );
}

function StatusPanel({
  title,
  subtitle,
  preview,
}: {
  title: string;
  subtitle: string;
  preview: string | null;
}) {
  return (
    <div className="border-border/60 bg-card rounded-xl border p-6 text-center sm:p-10">
      <div className="mx-auto flex flex-col items-center gap-4 sm:gap-6">
        {preview && (
          <div className="border-border/40 bg-muted relative h-40 w-40 overflow-hidden rounded-lg border sm:h-48 sm:w-48">
            <Image
              src={preview}
              alt="Your uploaded product"
              fill
              className="object-cover"
              sizes="192px"
              unoptimized
            />
          </div>
        )}
        <div>
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="text-primary h-4 w-4 animate-spin" />
            <span className="font-medium">{title}</span>
          </div>
          <p className="text-muted-foreground mt-2 text-sm">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

function ResultPanel({
  sourcePreview,
  resultDataUri,
  routingMeta,
  onDownload,
  onTryAnother,
}: {
  sourcePreview: string | null;
  resultDataUri: string;
  routingMeta: RoutingMeta | null;
  onDownload: () => void;
  onTryAnother: () => void;
}) {
  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 sm:gap-6">
        <div>
          <div className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-widest">
            Your photo
          </div>
          <div className="border-border/60 bg-muted relative aspect-square overflow-hidden rounded-xl border">
            {sourcePreview && (
              <Image
                src={sourcePreview}
                alt="Your uploaded product"
                fill
                className="object-cover"
                sizes="(min-width: 640px) 50vw, 100vw"
                unoptimized
              />
            )}
          </div>
        </div>

        <div>
          <div className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-widest">
            Studio White · Verified ✓
          </div>
          <div className="border-border/60 bg-muted relative aspect-square overflow-hidden rounded-xl border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resultDataUri}
              alt="Generated studio white shot"
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </div>

      {routingMeta && (
        <div className="border-border/60 bg-muted/30 mt-6 rounded-lg border p-4 text-center sm:mt-8">
          <p className="text-muted-foreground text-xs sm:text-sm">
            Generated via{' '}
            <span className="text-foreground font-medium">{routingMeta.path}</span>{' '}
            path in{' '}
            <span className="text-foreground font-medium">
              {(routingMeta.latency_ms / 1000).toFixed(1)}s
            </span>
            {routingMeta.verify_score !== null && (
              <>
                {' '}
                · Kimi verified at{' '}
                <span className="text-foreground font-medium">
                  {routingMeta.verify_score.toFixed(2)}
                </span>
              </>
            )}
          </p>
        </div>
      )}

      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
        <Button size="lg" onClick={onDownload} className="w-full sm:w-auto">
          <Download className="mr-2 h-4 w-4" />
          Download clean version
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={onTryAnother}
          className="w-full sm:w-auto"
        >
          Try another photo
        </Button>
      </div>
    </div>
  );
}

function ErrorPanel({ error, onRetry }: { error: string | null; onRetry: () => void }) {
  return (
    <div className="border-destructive/40 bg-destructive/5 rounded-xl border p-6 text-center sm:p-10">
      <div className="bg-destructive/10 text-destructive mx-auto flex h-12 w-12 items-center justify-center rounded-full">
        <X className="h-5 w-5" />
      </div>
      <h3 className="mt-4 font-semibold">Generation didn&apos;t work</h3>
      <p className="text-muted-foreground mt-2 text-sm">
        {error ?? 'Please try again in a few seconds.'}
      </p>
      <Button variant="outline" size="lg" onClick={onRetry} className="mt-6">
        Try again
      </Button>
    </div>
  );
}

function SignupModal({
  onClose,
  onSignup,
}: {
  onClose: () => void;
  onSignup: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="border-border bg-background relative w-full max-w-md rounded-xl border p-6 shadow-2xl sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground absolute right-4 top-4"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="bg-primary/10 text-primary mx-auto flex h-12 w-12 items-center justify-center rounded-full">
          <Sparkles className="h-5 w-5" />
        </div>

        <h3 className="mt-5 text-center text-xl font-semibold">
          Sign up to download
        </h3>
        <p className="text-muted-foreground mt-3 text-center text-sm">
          The clean, watermark-free version of your photo is one signup away.
          You&apos;ll get{' '}
          <span className="text-foreground font-medium">3 free credits</span> to
          generate more styles.
        </p>

        <Button size="lg" onClick={onSignup} className="mt-6 w-full">
          Sign up free
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>

        <p className="text-muted-foreground/70 mt-4 text-center text-xs">
          No credit card required. Cancel anytime.
        </p>
      </div>
    </div>
  );
}
