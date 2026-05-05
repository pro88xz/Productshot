'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

const emailSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
});

const passwordSignUpSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .max(72, 'Password is too long.'),
});

const passwordSignInSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
  password: z.string().min(1, 'Please enter your password.'),
});

export type AuthState = {
  error?: string;
  success?: boolean;
};

// ---------------------------------------------------------------
// Magic link flows
// ---------------------------------------------------------------

export async function signUpAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = emailSchema.safeParse({ email: formData.get('email') });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid email.' };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: `${SITE_URL}/auth/callback?next=/dashboard`,
      shouldCreateUser: true,
    },
  });

  if (error) {
    return { error: error.message };
  }

  redirect(`/check-email?email=${encodeURIComponent(parsed.data.email)}`);
}

export async function signInAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = emailSchema.safeParse({ email: formData.get('email') });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid email.' };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: `${SITE_URL}/auth/callback?next=/dashboard`,
      shouldCreateUser: false,
    },
  });

  if (error) {
    return { error: error.message };
  }

  redirect(`/check-email?email=${encodeURIComponent(parsed.data.email)}`);
}

// ---------------------------------------------------------------
// Password flows
// ---------------------------------------------------------------

export async function signUpWithPasswordAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = passwordSignUpSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${SITE_URL}/auth/callback?next=/dashboard`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  // If email confirmation is enabled, user gets a confirmation email.
  // If disabled, they're signed in immediately.
  if (data.user && !data.session) {
    redirect(`/check-email?email=${encodeURIComponent(parsed.data.email)}&confirm=true`);
  }

  redirect('/dashboard');
}

export async function signInWithPasswordAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = passwordSignInSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    // Don't leak which part was wrong (email vs password) — security best practice
    return { error: 'Email or password is incorrect.' };
  }

  redirect('/dashboard');
}

export async function requestPasswordResetAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = emailSchema.safeParse({ email: formData.get('email') });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid email.' };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${SITE_URL}/auth/callback?next=/reset-password`,
  });

  if (error) {
    return { error: error.message };
  }

  redirect(`/check-email?email=${encodeURIComponent(parsed.data.email)}&reset=true`);
}

export async function updatePasswordAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const password = formData.get('password');
  const parsed = z
    .object({
      password: z
        .string()
        .min(8, 'Password must be at least 8 characters.')
        .max(72, 'Password is too long.'),
    })
    .safeParse({ password });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid password.' };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { error: error.message };
  }

  redirect('/dashboard');
}

// ---------------------------------------------------------------
// Sign out
// ---------------------------------------------------------------

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/');
}
