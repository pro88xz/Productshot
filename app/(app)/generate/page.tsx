import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { GenerateClient } from '@/components/app/generate-client';

export const metadata: Metadata = {
  title: 'Generate photos',
  robots: { index: false, follow: false },
};

export default async function GeneratePage() {
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

  return <GenerateClient initialBalance={credits?.balance ?? 0} userEmail={user.email ?? ''} />;
}
