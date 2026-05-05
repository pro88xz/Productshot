import type { Metadata } from 'next';
import Link from 'next/link';
import { Mail, Sparkles } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Check your email',
  description: 'We sent you a magic link to sign in.',
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{ email?: string }>;
};

export default async function CheckEmailPage({ searchParams }: Props) {
  const { email } = await searchParams;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm text-center">
        <Link href="/" className="inline-flex items-center justify-center gap-2 font-semibold">
          <span className="bg-primary text-primary-foreground flex h-8 w-8 items-center justify-center rounded-lg">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="text-lg">ProductShot</span>
        </Link>

        <div className="bg-primary/10 text-primary mx-auto mt-12 flex h-16 w-16 items-center justify-center rounded-full">
          <Mail className="h-7 w-7" />
        </div>

        <h1 className="mt-6 text-2xl font-semibold tracking-tight">Check your email</h1>

        <p className="text-muted-foreground mt-3 text-sm">
          We sent a magic link to{' '}
          {email ? (
            <span className="text-foreground font-medium">{email}</span>
          ) : (
            'your email address'
          )}
          . Click the link to {email ? 'continue' : 'sign in'}.
        </p>

        <p className="text-muted-foreground mt-6 text-xs">
          Didn&apos;t get it? Check your spam folder, or{' '}
          <Link href="/sign-in" className="text-foreground underline underline-offset-4">
            try again
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
