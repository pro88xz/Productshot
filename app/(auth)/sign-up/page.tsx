import type { Metadata } from 'next';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';

import { AuthForm } from '@/components/shared/auth-form';

export const metadata: Metadata = {
  title: 'Create your account',
  description: 'Sign up for ProductShot. Three free generations on signup.',
  alternates: { canonical: '/sign-up' },
};

export default function SignUpPage() {
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
          <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Three free generations on signup. No credit card required.
          </p>
        </div>

        <div className="mt-8">
          <AuthForm mode="sign-up" />
        </div>

        <p className="text-muted-foreground mt-8 text-center text-xs">
          By creating an account you agree to our{' '}
          <Link href="/terms" className="underline underline-offset-4">
            Terms
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="underline underline-offset-4">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
