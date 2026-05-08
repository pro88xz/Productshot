import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

const ADMIN_EMAIL = 'secretsafe.cc@gmail.com';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email?.toLowerCase() !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data, error } = await supabase.rpc('toggle_generation_featured', {
    generation_id: id,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
