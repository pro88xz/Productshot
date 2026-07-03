import 'dotenv/config';
import { createAdminClient } from '../../lib/supabase/admin';

async function main() {
  console.log('SUPABASE_URL prefix:', (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').slice(0, 30) + '...');
  console.log('SERVICE_ROLE_KEY present:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
  console.log('SERVICE_ROLE_KEY starts with eyJ:', (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').startsWith('eyJ'));
  console.log('');

  const admin = createAdminClient();

  console.log('--- Query 1: all backdrops ---');
  const all = await admin.from('scaffold_backdrops').select('scene_id, variant_index', { count: 'exact' });
  console.log('  error:', all.error?.message ?? 'none');
  console.log('  count:', all.count);
  console.log('  rows returned:', all.data?.length ?? 0);
  console.log('');

  console.log('--- Query 2: filtered to studio-white ---');
  const filtered = await admin
    .from('scaffold_backdrops')
    .select('scene_id, variant_index, public_url')
    .eq('scene_id', 'studio-white');
  console.log('  error:', filtered.error?.message ?? 'none');
  console.log('  rows returned:', filtered.data?.length ?? 0);
  if (filtered.data?.[0]) {
    console.log('  first row:', JSON.stringify(filtered.data[0]));
  }
  console.log('');

  console.log('--- Query 3: does the .single-row fetch work? ---');
  const single = await admin
    .from('scaffold_backdrops')
    .select('public_url')
    .eq('scene_id', 'studio-white')
    .limit(1)
    .maybeSingle();
  console.log('  error:', single.error?.message ?? 'none');
  console.log('  data:', single.data ? JSON.stringify(single.data) : 'null');
}

main().catch((err) => {
  console.error('DIAG FAILED:', err instanceof Error ? err.stack ?? err.message : err);
  process.exit(1);
});
