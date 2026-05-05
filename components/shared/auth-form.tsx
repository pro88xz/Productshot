'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signInAction, signUpAction, type AuthState } from '@/app/(auth)/actions';

type AuthFormProps = {
  mode: 'sign-in' | 'sign-up';
};

const initialState: AuthState = {};

export function AuthForm({ mode }: AuthFormProps) {
  const action = mode === 'sign-up' ? signUpAction : signInAction;
  const [state, formAction, isPending] = useActionState(action, initialState);

  const isSignUp = mode === 'sign-up';

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          disabled={isPending}
        />
      </div>

      {state.error && (
        <p className="text-destructive text-sm" role="alert">
          {state.error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isSignUp ? 'Create account' : 'Send magic link'}
      </Button>

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
    </form>
  );
}
