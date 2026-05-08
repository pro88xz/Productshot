import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Fetch the generation and verify ownership
  const { data: generation, error: fetchError } = await supabase
    .from('generations')
    .select('id, user_id, status')
    .eq('id', id)
    .single();

  if (fetchError || !generation) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (generation.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Delete corresponding storage files (best effort — don't fail if storage fails)
  const admin = createAdminClient();
  try {
    const folder = `${user.id}/generated/${id}`;
    const { data: files } = await admin.storage.from('product-photos').list(folder);
    if (files && files.length > 0) {
      const paths = files.map((f) => `${folder}/${f.name}`);
      await admin.storage.from('product-photos').remove(paths);
    }
  } catch (err) {
    console.error('Storage cleanup failed (non-fatal):', err);
  }

  // Delete the DB row
  const { error: deleteError } = await supabase.from('generations').delete().eq('id', id);

  if (deleteError) {
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
