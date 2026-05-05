import { NextResponse, type NextRequest } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

type Params = {
  generation_id: string;
  index: string;
};

export async function GET(request: NextRequest, { params }: { params: Promise<Params> }) {
  // ----- 1. Auth -----
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { generation_id, index } = await params;
  const idx = Number.parseInt(index, 10);

  if (Number.isNaN(idx) || idx < 0) {
    return NextResponse.json({ error: 'Invalid index' }, { status: 400 });
  }

  // ----- 2. Fetch the generation, verify ownership -----
  const admin = createAdminClient();
  const { data: generation, error } = await admin
    .from('generations')
    .select('user_id, output_image_urls')
    .eq('id', generation_id)
    .maybeSingle();

  if (error || !generation) {
    return NextResponse.json({ error: 'Generation not found' }, { status: 404 });
  }

  if (generation.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // ----- 3. Reconstruct the storage path (don't trust the saved URL — it may have expired) -----
  const storagePath = `${user.id}/generated/${generation_id}/${idx}.jpg`;

  // ----- 4. Generate a fresh signed URL -----
  const { data: signed, error: signedError } = await admin.storage
    .from('product-photos')
    .createSignedUrl(storagePath, 60 * 5); // 5 min — just long enough to fetch

  if (signedError || !signed) {
    return NextResponse.json({ error: 'Image not available' }, { status: 404 });
  }

  // ----- 5. Fetch and stream back with proper headers -----
  const isDownload = request.nextUrl.searchParams.get('download') === '1';

  const upstream = await fetch(signed.signedUrl);
  if (!upstream.ok) {
    return NextResponse.json({ error: 'Image fetch failed' }, { status: 404 });
  }

  const headers = new Headers();
  headers.set('Content-Type', 'image/jpeg');
  headers.set('Cache-Control', 'private, max-age=300');

  if (isDownload) {
    headers.set(
      'Content-Disposition',
      `attachment; filename="productshot-${generation_id.slice(0, 8)}-${idx + 1}.jpg"`,
    );
  } else {
    headers.set('Content-Disposition', `inline; filename="productshot-${idx + 1}.jpg"`);
  }

  return new NextResponse(upstream.body, { status: 200, headers });
}
