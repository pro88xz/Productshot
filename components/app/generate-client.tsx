'use client';

import { useCallback, useRef, useState } from 'react';
import Link from 'next/link';

import {
  AlertCircle,
  ArrowLeft,
  Check,
  Download,
  ImageIcon,
  Loader2,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { signOutAction } from '@/app/(auth)/actions';
import { SCENE_STYLES, type SceneStyle } from '@/lib/replicate/scenes';
import type { GenerateResponse, UploadResponse } from '@/types/generation';

type Step = 'upload' | 'select-scenes' | 'generating' | 'results';

type GenerateClientProps = {
  initialBalance: number;
  userEmail: string;
};

export function GenerateClient({ initialBalance, userEmail }: GenerateClientProps) {
  const [step, setStep] = useState<Step>('upload');
  const [balance, setBalance] = useState(initialBalance);

  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourcePreview, setSourcePreview] = useState<string | null>(null);
  const [sourceImageUrl, setSourceImageUrl] = useState<string | null>(null);

  const [selectedSceneIds, setSelectedSceneIds] = useState<string[]>([]);
  const [outputUrls, setOutputUrls] = useState<string[]>([]);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep('upload');
    setSourceFile(null);
    if (sourcePreview) URL.revokeObjectURL(sourcePreview);
    setSourcePreview(null);
    setSourceImageUrl(null);
    setSelectedSceneIds([]);
    setOutputUrls([]);
    setUploadError(null);
    setGenerateError(null);
  };

  const handleFile = useCallback(
    async (file: File) => {
      setUploadError(null);

      if (!file.type.startsWith('image/')) {
        setUploadError('Please select an image file (JPEG, PNG, or WebP).');
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setUploadError('File too large. Max 10 MB.');
        return;
      }

      setSourceFile(file);
      setSourcePreview(URL.createObjectURL(file));
      setIsUploading(true);

      try {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const data = (await res.json()) as UploadResponse | { error: string };

        if (!res.ok || 'error' in data) {
          throw new Error('error' in data ? data.error : 'Upload failed');
        }

        setSourceImageUrl(data.source_image_url);
        setStep('select-scenes');
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : 'Upload failed');
        setSourceFile(null);
        if (sourcePreview) URL.revokeObjectURL(sourcePreview);
        setSourcePreview(null);
      } finally {
        setIsUploading(false);
      }
    },
    [sourcePreview],
  );

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const toggleScene = (id: string) => {
    setSelectedSceneIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  const handleGenerate = async () => {
    if (!sourceImageUrl || selectedSceneIds.length === 0) return;

    if (selectedSceneIds.length > balance) {
      setGenerateError(
        `You need ${selectedSceneIds.length} credits but only have ${balance}. Reduce your selection or top up.`,
      );
      return;
    }

    setIsGenerating(true);
    setGenerateError(null);
    setStep('generating');

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_image_url: sourceImageUrl,
          scene_style_ids: selectedSceneIds,
        }),
      });

      const data = (await res.json()) as GenerateResponse | { error: string };

      if (!res.ok || 'error' in data) {
        throw new Error('error' in data ? data.error : 'Generation failed');
      }

      setOutputUrls(data.output_urls ?? []);
      if (typeof data.remaining_credits === 'number') {
        setBalance(data.remaining_credits);
      }
      setStep('results');
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'Generation failed');
      setStep('select-scenes');
    } finally {
      setIsGenerating(false);
    }
  };

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
            <span className="text-muted-foreground hidden text-sm sm:inline">{userEmail}</span>
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
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Generate photos</h1>
          <p className="text-muted-foreground mt-2">
            Upload one product photo. Pick the scenes you want. Get back studio-quality results.
          </p>

          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="mt-8">
              <UploadZone
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                isUploading={isUploading}
                error={uploadError}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={onFileInput}
                className="hidden"
              />
            </div>
          )}

          {/* Step 2: Pick scenes */}
          {step === 'select-scenes' && sourcePreview && (
            <div className="mt-8 space-y-8">
              <SourcePreview
                previewUrl={sourcePreview}
                fileName={sourceFile?.name ?? 'photo'}
                onChange={reset}
              />

              <div>
                <div className="flex items-baseline justify-between">
                  <h2 className="text-xl font-semibold tracking-tight">Pick your scenes</h2>
                  <p className="text-muted-foreground text-sm">
                    {selectedSceneIds.length} selected · {selectedSceneIds.length}{' '}
                    {selectedSceneIds.length === 1 ? 'credit' : 'credits'}
                  </p>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {SCENE_STYLES.map((scene) => (
                    <SceneCard
                      key={scene.id}
                      scene={scene}
                      selected={selectedSceneIds.includes(scene.id)}
                      onToggle={() => toggleScene(scene.id)}
                    />
                  ))}
                </div>
              </div>

              {generateError && (
                <div className="border-destructive/40 bg-destructive/5 text-destructive flex items-start gap-2 rounded-lg border p-4 text-sm">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{generateError}</span>
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                <Button variant="ghost" onClick={reset} disabled={isGenerating}>
                  Start over
                </Button>
                <Button
                  size="lg"
                  onClick={handleGenerate}
                  disabled={
                    isGenerating ||
                    selectedSceneIds.length === 0 ||
                    selectedSceneIds.length > balance
                  }
                >
                  {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Generate {selectedSceneIds.length || ''}{' '}
                  {selectedSceneIds.length === 1 ? 'photo' : 'photos'}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Generating */}
          {step === 'generating' && (
            <div className="mt-16 flex flex-col items-center justify-center text-center">
              <div className="bg-primary/10 text-primary flex h-16 w-16 items-center justify-center rounded-full">
                <Loader2 className="h-7 w-7 animate-spin" />
              </div>
              <h2 className="mt-6 text-2xl font-semibold tracking-tight">Generating your photos</h2>
              <p className="text-muted-foreground mt-2 max-w-md text-sm">
                This usually takes 30 to 60 seconds. Don&apos;t close the tab — your photos will
                appear here when ready.
              </p>
            </div>
          )}

          {/* Step 4: Results */}
          {step === 'results' && (
            <div className="mt-8 space-y-8">
              <div className="border-primary/40 bg-primary/5 flex items-start gap-3 rounded-lg border p-4">
                <Check className="text-primary mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="font-medium">
                    Generated {outputUrls.length} {outputUrls.length === 1 ? 'photo' : 'photos'}
                  </p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Click any photo to download. {balance} {balance === 1 ? 'credit' : 'credits'}{' '}
                    remaining.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {outputUrls.map((url, i) => (
                  <ResultCard key={i} url={url} index={i} />
                ))}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <Button variant="outline" asChild>
                  <Link href="/dashboard">Back to dashboard</Link>
                </Button>
                <Button onClick={reset}>Generate more</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------

type UploadZoneProps = {
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onClick: () => void;
  isUploading: boolean;
  error: string | null;
};

function UploadZone({ onDrop, onClick, isUploading, error }: UploadZoneProps) {
  return (
    <div>
      <div
        onClick={onClick}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className="border-border/60 hover:border-primary/40 hover:bg-muted/30 cursor-pointer rounded-2xl border-2 border-dashed p-12 text-center transition-colors sm:p-16"
      >
        <div className="bg-primary/10 text-primary mx-auto flex h-14 w-14 items-center justify-center rounded-full">
          {isUploading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <Upload className="h-6 w-6" />
          )}
        </div>
        <p className="mt-5 text-lg font-medium">
          {isUploading ? 'Uploading…' : 'Drop a product photo here'}
        </p>
        <p className="text-muted-foreground mt-1 text-sm">or click to browse</p>
        <p className="text-muted-foreground mt-6 text-xs">
          JPEG, PNG, or WebP · Max 10 MB · Best with good lighting and clear product
        </p>
      </div>

      {error && (
        <div className="border-destructive/40 bg-destructive/5 text-destructive mt-4 flex items-start gap-2 rounded-lg border p-4 text-sm">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

type SourcePreviewProps = {
  previewUrl: string;
  fileName: string;
  onChange: () => void;
};

function SourcePreview({ previewUrl, fileName, onChange }: SourcePreviewProps) {
  return (
    <Card className="flex items-center gap-4 p-4">
      <div className="bg-muted relative h-20 w-20 shrink-0 overflow-hidden rounded-lg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={previewUrl} alt={fileName} className="h-full w-full object-cover" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{fileName}</p>
        <p className="text-muted-foreground text-xs">Source photo · ready to generate</p>
      </div>
      <Button variant="ghost" size="sm" onClick={onChange}>
        <X className="h-4 w-4" />
        <span className="ml-1 hidden sm:inline">Change</span>
      </Button>
    </Card>
  );
}

type SceneCardProps = {
  scene: SceneStyle;
  selected: boolean;
  onToggle: () => void;
};

function SceneCard({ scene, selected, onToggle }: SceneCardProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`group relative flex flex-col overflow-hidden rounded-xl border p-5 text-left transition-all ${
        selected
          ? 'border-primary bg-primary/5 ring-primary/30 ring-2'
          : 'border-border/60 hover:border-border bg-card hover:bg-muted/30'
      }`}
    >
      <div
        className={`absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors ${
          selected ? 'border-primary bg-primary' : 'border-border bg-background'
        }`}
        aria-hidden="true"
      >
        {selected && <Check className="text-primary-foreground h-3 w-3" />}
      </div>
      <ImageIcon className="text-muted-foreground h-5 w-5" />
      <p className="mt-3 font-semibold">{scene.name}</p>
      <p className="text-muted-foreground mt-1 text-sm">{scene.description}</p>
    </button>
  );
}

type ResultCardProps = {
  url: string;
  index: number;
};

function ResultCard({ url, index }: ResultCardProps) {
  return (
    <a
      href={url}
      download={`productshot-${index + 1}.jpg`}
      className="group bg-muted/40 relative block aspect-square overflow-hidden rounded-xl"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={`Generated photo ${index + 1}`}
        className="h-full w-full object-cover transition-transform group-hover:scale-105"
        loading="lazy"
      />
      <div className="absolute inset-0 flex items-end justify-end bg-gradient-to-t from-black/60 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
        <span className="text-foreground inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium">
          <Download className="h-3.5 w-3.5" />
          Download
        </span>
      </div>
    </a>
  );
}
