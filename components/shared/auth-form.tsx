'use client';

import Link from 'next/link';
import { useActionState, useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  signInAction,
  signInWithGoogleAction,
  signInWithPasswordAction,
  signUpAction,
  signUpWithPasswordAction,
  type AuthState,
} from '@/app/(auth)/actions';

type AuthFormProps = {
  mode: 'sign-in' | 'sign-up';
};

const initialState: AuthState = {};

type Method = 'password' | 'magic';

export function AuthForm({ mode }: AuthFormProps) {
  const [method, setMethod] = useState<Method>('password');
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [isGooglePending, startGoogleTransition] = useTransition();

  const isSignUp = mode === 'sign-up';

  const passwordAction = isSignUp ? signUpWithPasswordAction : signInWithPasswordAction;
  const magicAction = isSignUp ? signUpAction : signInAction;

  const [pwState, pwFormAction, pwPending] = useActionState(passwordAction, initialState);
  const [magicState, magicFormAction, magicPending] = useActionState(magicAction, initialState);

  const handleGoogleClick = () => {
    setGoogleError(null);
    startGoogleTransition(async () => {
      const result = await signInWithGoogleAction();
      if (result?.error) {
        setGoogleError(result.error);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Google button */}
      <div>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleGoogleClick}
          disabled={isGooglePending}
        >
          {isGooglePending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <GoogleIcon className="mr-2 h-4 w-4" />
          )}
          Continue with Google
        </Button>
        {googleError && (
          <p className="text-destructive mt-2 text-sm" role="alert">
            {googleError}
          </p>
        )}
      </div>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="border-border w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background text-muted-foreground px-2">Or with email</span>
        </div>
      </div>

      {/* Method toggle */}
      <div className="border-border/60 grid grid-cols-2 gap-1 rounded-lg border p-1">
        <button
          type="button"
          onClick={() => setMethod('password')}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            method === 'password'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Password
        </button>
        <button
          type="button"
          onClick={() => setMethod('magic')}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            method === 'magic'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Magic link
        </button>
      </div>

      {method === 'password' ? (
        <form action={pwFormAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
              disabled={pwPending}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              {!isSignUp && (
                <Link
                  href="/forgot-password"
                  className="text-muted-foreground hover:text-foreground text-xs underline-offset-4 hover:underline"
                >
                  Forgot?
                </Link>
              )}
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              required
              minLength={isSignUp ? 8 : undefined}
              placeholder={isSignUp ? 'At least 8 characters' : 'Your password'}
              disabled={pwPending}
            />
          </div>

          {pwState.error && (
            <p className="text-destructive text-sm" role="alert">
              {pwState.error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={pwPending}>
            {pwPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSignUp ? 'Create account' : 'Sign in'}
          </Button>
        </form>
      ) : (
        <form action={magicFormAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email-magic">Email</Label>
            <Input
              id="email-magic"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
              disabled={magicPending}
            />
          </div>

          {magicState.error && (
            <p className="text-destructive text-sm" role="alert">
              {magicState.error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={magicPending}>
            {magicPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send magic link
          </Button>
        </form>
      )}

      <p className="text-muted-foreground text-center text-sm">
        {isSignUp ? (
          <>
            Already have an account?{' '}
            <Link href="/sign-in" className="text-foreground underline underline-offset-4">
              Sign in
            </Link>
          </>
        ) : (
          <>
            New here?{' '}
            <Link href="/sign-up" className="text-foreground underline underline-offset-4">
              Create an account
            </Link>
          </>
        )}
      </p>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
    >
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
