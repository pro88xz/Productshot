import { NextResponse, type NextRequest } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export async function POST(request: NextRequest) {
  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Parse multipart form
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }

  // Validate file
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `File too large. Max size is ${MAX_FILE_SIZE / 1024 / 1024}MB.` },
      { status: 400 },
    );
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: 'File type not supported. Use JPEG, PNG, or WebP.' },
      { status: 400 },
    );
  }

  // Upload via service-role client (bypasses RLS, but we enforce path structure)
  const admin = createAdminClient();
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const timestamp = Date.now();
  const storagePath = `${user.id}/originals/${timestamp}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await admin.storage
    .from('product-photos')
    .upload(storagePath, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error('Upload error:', uploadError);
    return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 });
  }

  // Get a signed URL valid for 1 hour (used to feed Replicate)
  const { data: signed, error: signedError } = await admin.storage
    .from('product-photos')
    .createSignedUrl(storagePath, 60 * 60);

  if (signedError || !signed) {
    console.error('Signed URL error:', signedError);
    return NextResponse.json(
      { error: 'Could not generate access URL. Please try again.' },
      { status: 500 },
    );
  }

  return NextResponse.json({
    source_image_url: signed.signedUrl,
    storage_path: storagePath,
  });
}
