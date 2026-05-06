import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { resend, FROM_EMAIL, REPLY_TO } from '@/lib/email/resend';
import { buildPaymentReceipt } from '@/lib/email/templates/payment-receipt';

/**
 * TEMPORARY test endpoint — sends a fake receipt to the authenticated user.
 * Used to verify Resend integration before any real customer hits it.
 * REMOVE AFTER VERIFICATION.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { subject, html, text } = buildPaymentReceipt({
    recipientEmail: user.email,
    recipientName: (user.user_metadata?.full_name as string | undefined) ?? undefined,
    planName: 'Starter pack (TEST)',
    creditsGranted: 20,
    newBalance: 23,
    amountUsd: '9.00',
    transactionId: 'TEST-' + Date.now(),
    paidAt: new Date(),
  });

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: user.email,
      replyTo: REPLY_TO,
      subject,
      html,
      text,
    });

    return NextResponse.json({
      ok: true,
      sent_to: user.email,
      resend_id: result.data?.id ?? null,
      error: result.error ?? null,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
