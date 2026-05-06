import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { paypalOrders } from '@/lib/paypal/client';
import { grantCredits, getCredits } from '@/lib/credits';
import { getPlan, type PlanKind } from '@/lib/paypal/plans';
import { resend, FROM_EMAIL, REPLY_TO } from '@/lib/email/resend';
import { buildPaymentReceipt } from '@/lib/email/templates/payment-receipt';

const requestSchema = z.object({
  order_id: z.string().min(1),
});

export async function POST(request: NextRequest) {
  // Auth
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Validate body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid order_id' }, { status: 400 });
  }

  const { order_id } = parsed.data;

  const admin = createAdminClient();

  // Confirm the payment row exists and belongs to this user
  const { data: payment, error: paymentError } = await admin
    .from('payments')
    .select('id, user_id, kind, status, credits_granted')
    .eq('paypal_order_id', order_id)
    .maybeSingle();

  if (paymentError || !payment) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  if (payment.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Idempotency — if we already completed this, just return success
  if (payment.status === 'completed') {
    const credits = await getCredits(user.id);
    return NextResponse.json({
      status: 'completed',
      credits_granted: payment.credits_granted,
      remaining_credits: credits.balance,
    });
  }

  // Capture the payment with PayPal
  let captureResult;
  try {
    const response = await paypalOrders.captureOrder({
      id: order_id,
      prefer: 'return=representation',
    });
    captureResult = response.result;

    if (response.statusCode !== 200 && response.statusCode !== 201) {
      console.error('PayPal capture non-success:', response.statusCode);
      return NextResponse.json({ error: 'Capture failed' }, { status: 500 });
    }
  } catch (err) {
    console.error('PayPal capture error:', err);

    // Mark payment failed
    await admin
      .from('payments')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', payment.id);

    return NextResponse.json({ error: 'Capture failed' }, { status: 500 });
  }

  // Verify capture succeeded
  if (captureResult.status !== 'COMPLETED') {
    await admin
      .from('payments')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', payment.id);

    return NextResponse.json(
      { error: `Capture status was ${captureResult.status}` },
      { status: 500 },
    );
  }

  // Find the capture ID for our records
  const captureId = captureResult.purchaseUnits?.[0]?.payments?.captures?.[0]?.id ?? null;

  // Grant credits atomically
  const plan = getPlan(payment.kind as PlanKind);
  if (!plan) {
    console.error('Unknown plan kind on payment:', payment.kind);
    return NextResponse.json({ error: 'Invalid plan on payment record' }, { status: 500 });
  }

  await grantCredits(user.id, plan.credits);

  // Mark payment complete
  await admin
    .from('payments')
    .update({
      status: 'completed',
      credits_granted: plan.credits,
      paypal_capture_id: captureId,
      completed_at: new Date().toISOString(),
    })
    .eq('id', payment.id);

  const credits = await getCredits(user.id);

  // Send receipt email (don't block if it fails)
  try {
    if (user.email) {
      const { subject, html, text } = buildPaymentReceipt({
        recipientEmail: user.email,
        recipientName: user.user_metadata?.full_name as string | undefined,
        planName: plan.name,
        creditsGranted: plan.credits,
        newBalance: credits.balance,
        amountUsd: plan.amountUsd,
        transactionId: captureId ?? order_id,
        paidAt: new Date(),
      });
      await resend.emails.send({
        from: FROM_EMAIL,
        to: user.email,
        replyTo: REPLY_TO,
        subject,
        html,
        text,
      });
    }
  } catch (err) {
    console.error('Receipt email failed:', err);
  }

  return NextResponse.json({
    status: 'completed',
    credits_granted: plan.credits,
    remaining_credits: credits.balance,
  });
}
