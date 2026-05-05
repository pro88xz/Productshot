'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  signInAction,
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
  const isSignUp = mode === 'sign-up';

  const passwordAction = isSignUp ? signUpWithPasswordAction : signInWithPasswordAction;
  const magicAction = isSignUp ? signUpAction : signInAction;

  const [pwState, pwFormAction, pwPending] = useActionState(passwordAction, initialState);
  const [magicState, magicFormAction, magicPending] = useActionState(magicAction, initialState);

  return (
    <div className="space-y-6">
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
