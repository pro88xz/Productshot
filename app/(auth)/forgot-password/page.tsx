import type { Metadata } from 'next';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';

import { ForgotPasswordForm } from '@/components/shared/forgot-password-form';

export const metadata: Metadata = {
  title: 'Reset your password',
  description: 'Send yourself a password reset link.',
  alternates: { canonical: '/forgot-password' },
};

export default function ForgotPasswordPage() {
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
          <h1 className="text-2xl font-semibold tracking-tight">Reset your password</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Enter your email and we&apos;ll send you a link to set a new password.
          </p>
        </div>

        <div className="mt-8">
          <ForgotPasswordForm />
        </div>

        <p className="text-muted-foreground mt-6 text-center text-sm">
          Remembered it?{' '}
          <Link href="/sign-in" className="text-foreground underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
