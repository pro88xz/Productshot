import { NextRequest, NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';

type RouteContext = {
  params: Promise<{ generation_id: string; index: string }>;
};

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { generation_id, index } = await params;
  const idx = parseInt(index, 10);

  if (isNaN(idx) || idx < 0) {
    return NextResponse.json({ error: 'Invalid index' }, { status: 400 });
  }

  const admin = createAdminClient();

  // Verify the generation is featured (public access requires explicit feature flag)
  const { data: generation, error } = await admin
    .from('generations')
    .select('user_id, status, is_featured, output_image_urls')
    .eq('id', generation_id)
    .single();

  if (error || !generation) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (!generation.is_featured) {
    return NextResponse.json({ error: 'Not public' }, { status: 403 });
  }

  if (generation.status !== 'completed') {
    return NextResponse.json({ error: 'Not ready' }, { status: 404 });
  }

  const outputs = (generation.output_image_urls as string[] | null) ?? [];
  if (idx >= outputs.length) {
    return NextResponse.json({ error: 'Index out of range' }, { status: 404 });
  }

  // Generate fresh signed URL from the canonical storage path
  const storagePath = `${generation.user_id}/generated/${generation_id}/${idx}.jpg`;
  const { data: signed, error: signedError } = await admin.storage
    .from('product-photos')
    .createSignedUrl(storagePath, 60 * 60); // 1 hour cache

  if (signedError || !signed) {
    return NextResponse.json({ error: 'Image not available' }, { status: 404 });
  }

  // Fetch and stream back with caching headers
  const upstream = await fetch(signed.signedUrl);
  if (!upstream.ok) {
    return NextResponse.json({ error: 'Upstream fetch failed' }, { status: 502 });
  }

  const buffer = await upstream.arrayBuffer();

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
