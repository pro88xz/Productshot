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

/**
 * Translate Supabase error messages and codes into user-friendly text.
 * Supabase ships internal-looking errors that don't make sense to end users.
 */
function humanizeAuthError(
  message: string,
  context: 'magic-signin' | 'magic-signup' | 'password' | 'reset',
): string {
  const lower = message.toLowerCase();

  // Sign-in tried with a non-existent account
  if (lower.includes('signups not allowed for otp')) {
    if (context === 'magic-signin') {
      return "We couldn't find an account with that email. Want to create one instead?";
    }
    return 'New signups are temporarily disabled. Try again later.';
  }

  // Sender domain not verified or wrong recipient on Resend testing
  if (
    lower.includes('error sending') ||
    lower.includes('email rate limit') ||
    lower.includes('smtp')
  ) {
    return "We couldn't send the email right now. Please try again in a minute, or use the password option.";
  }

  // User already registered
  if (lower.includes('user already registered')) {
    return 'An account with that email already exists. Try signing in instead.';
  }

  // Bad password format
  if (lower.includes('password should be')) {
    return 'Password must be at least 8 characters.';
  }

  // Invalid login credentials
  if (lower.includes('invalid login credentials')) {
    return 'Email or password is incorrect.';
  }

  // Email not confirmed
  if (lower.includes('email not confirmed')) {
    return 'Please confirm your email before signing in. Check your inbox for the confirmation link.';
  }

  // Generic fallback — short, no internal jargon leaked
  return 'Something went wrong. Please try again.';
}

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
    return { error: humanizeAuthError(error.message, 'magic-signup') };
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
    return { error: humanizeAuthError(error.message, 'magic-signin') };
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
    return { error: humanizeAuthError(error.message, 'password') };
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
    // Always say "incorrect" to avoid leaking which part was wrong
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
    return { error: humanizeAuthError(error.message, 'reset') };
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
    return { error: humanizeAuthError(error.message, 'password') };
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

// ---------------------------------------------------------------
// Google OAuth
// ---------------------------------------------------------------

export async function signInWithGoogleAction(): Promise<AuthState> {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${SITE_URL}/auth/callback?next=/dashboard`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) {
    return { error: humanizeAuthError(error.message, 'password') };
  }

  if (data?.url) {
    redirect(data.url);
  }

  return { error: 'Could not start Google sign-in. Please try again.' };
}
