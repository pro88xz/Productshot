import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Check if the user has at least `amount` credits.
 */
export async function hasCredits(userId: string, amount: number): Promise<boolean> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('credits')
    .select('balance')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) return false;

  return data.balance >= amount;
}

/**
 * Get the user's current credit state.
 */
export async function getCredits(userId: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('credits')
    .select('balance, lifetime_earned, lifetime_spent')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;

  return data ?? { balance: 0, lifetime_earned: 0, lifetime_spent: 0 };
}

/**
 * Deduct credits atomically. Returns true if successful.
 * Returns false if the user doesn't have enough credits.
 *
 * This uses a Postgres-side conditional update to prevent
 * race conditions where two simultaneous requests both pass
 * an initial balance check.
 */
export async function deductCredits(userId: string, amount: number): Promise<boolean> {
  const supabase = createAdminClient();

  // Atomic update: only succeeds if balance >= amount
  const { data, error } = await supabase.rpc('deduct_credits_atomic', {
    p_user_id: userId,
    p_amount: amount,
  });

  if (error) {
    console.error('deductCredits error:', error);
    return false;
  }

  return data === true;
}

/**
 * Refund credits when a generation fails.
 */
export async function refundCredits(userId: string, amount: number): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase.rpc('refund_credits_atomic', {
    p_user_id: userId,
    p_amount: amount,
  });

  if (error) {
    console.error('refundCredits error:', error);
  }
}

/**
 * Grant credits — used after a successful payment.
 */
export async function grantCredits(userId: string, amount: number): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase.rpc('grant_credits_atomic', {
    p_user_id: userId,
    p_amount: amount,
  });

  if (error) {
    console.error('grantCredits error:', error);
    throw error;
  }
}
