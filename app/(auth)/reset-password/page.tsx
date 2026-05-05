import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Sparkles } from 'lucide-react';

import { createClient } from '@/lib/supabase/server';
import { ResetPasswordForm } from '@/components/shared/reset-password-form';

export const metadata: Metadata = {
  title: 'Set a new password',
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The reset link auto-signs the user in; if there's no user here, the
  // link was invalid or expired.
  if (!user) {
    redirect('/forgot-password');
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="flex items-center justify-center gap-2 font-semibold">
          <span className="bg-primary text-primary-foreground flex h-8 w-8 items-center justify-center rounded-lg">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="text-lg">ProductShot</span>
        </Link>

        <div className="mt-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Set a new password</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Choose something you&apos;ll remember. Minimum 8 characters.
          </p>
        </div>

        <div className="mt-8">
          <ResetPasswordForm />
        </div>
      </div>
    </div>
  );
}
