import type { Metadata } from 'next';
import Link from 'next/link';
import { LensIcon } from '@/components/shared/lens-icon';

import { AuthForm } from '@/components/shared/auth-form';

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to your ProductShot account.',
  alternates: { canonical: '/sign-in' },
};

export default function SignInPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="flex items-center justify-center gap-2 font-semibold">
          <LensIcon className="h-8 w-8" />
          <span className="text-lg">ProductShot</span>
        </Link>

        <div className="mt-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Enter your email and we&apos;ll send you a magic link.
          </p>
        </div>

        <div className="mt-8">
          <AuthForm mode="sign-in" />
        </div>
      </div>
    </div>
  );
}
