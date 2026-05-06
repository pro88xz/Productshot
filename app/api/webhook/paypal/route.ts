import { NextResponse, type NextRequest } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getPayPalAccessToken, PAYPAL_API_BASE } from '@/lib/paypal/client';
import { grantCredits } from '@/lib/credits';
import { getPlan, type PlanKind } from '@/lib/paypal/plans';

type PayPalWebhookEvent = {
  id: string;
  event_type: string;
  resource_type?: string;
  resource: {
    id?: string;
    custom_id?: string;
    custom?: string;
    supplementary_data?: {
      related_ids?: {
        order_id?: string;
      };
    };
    [key: string]: unknown;
  };
};

/**
 * Verify the webhook came from PayPal using their verify-webhook-signature endpoint.
 */
async function verifySignature(request: NextRequest, rawBody: string): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    console.error('PAYPAL_WEBHOOK_ID not set');
    return false;
  }

  const transmissionId = request.headers.get('paypal-transmission-id');
  const transmissionTime = request.headers.get('paypal-transmission-time');
  const certUrl = request.headers.get('paypal-cert-url');
  const authAlgo = request.headers.get('paypal-auth-algo');
  const transmissionSig = request.headers.get('paypal-transmission-sig');

  if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) {
    console.error('Missing PayPal webhook headers');
    return false;
  }

  let webhookEvent: unknown;
  try {
    webhookEvent = JSON.parse(rawBody);
  } catch {
    return false;
  }

  const accessToken = await getPayPalAccessToken();

  const verifyRes = await fetch(`${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      transmission_id: transmissionId,
      transmission_time: transmissionTime,
      cert_url: certUrl,
      auth_algo: authAlgo,
      transmission_sig: transmissionSig,
      webhook_id: webhookId,
      webhook_event: webhookEvent,
    }),
  });

  if (!verifyRes.ok) {
    console.error('Webhook verification request failed:', verifyRes.status);
    return false;
  }

  const data = (await verifyRes.json()) as { verification_status?: string };
  return data.verification_status === 'SUCCESS';
}

export async function POST(request: NextRequest) {
  // Read raw body for signature verification
  const rawBody = await request.text();

  // Verify the webhook is genuinely from PayPal
  const isValid = await verifySignature(request, rawBody);
  if (!isValid) {
    console.error('PayPal webhook signature verification failed');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // Parse event
  let event: PayPalWebhookEvent;
  try {
    event = JSON.parse(rawBody) as PayPalWebhookEvent;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const admin = createAdminClient();

  // Idempotency — refuse to process the same event twice
  const { error: insertError } = await admin.from('paypal_webhook_events').insert({
    event_id: event.id,
    event_type: event.event_type,
    resource_id: event.resource?.id ?? null,
    payload: event,
  });

  if (insertError) {
    // Probably duplicate — that's fine, we already processed it
    if (insertError.code === '23505') {
      return NextResponse.json({ status: 'already_processed' });
    }
    console.error('Failed to record webhook event:', insertError);
    return NextResponse.json({ error: 'Could not record event' }, { status: 500 });
  }

  // Route by event type
  try {
    switch (event.event_type) {
      case 'PAYMENT.CAPTURE.COMPLETED':
        await handleCaptureCompleted(event);
        break;
      case 'PAYMENT.CAPTURE.REFUNDED':
        await handleCaptureRefunded(event);
        break;
      case 'PAYMENT.CAPTURE.DENIED':
        // No action — payment never succeeded
        break;
      case 'BILLING.SUBSCRIPTION.ACTIVATED':
      case 'BILLING.SUBSCRIPTION.CANCELLED':
      case 'BILLING.SUBSCRIPTION.PAYMENT.FAILED':
        // Subscription support comes in a follow-up batch
        break;
      default:
        // Unknown event — log but don't error
        console.warn('Unhandled webhook event type:', event.event_type);
    }
  } catch (err) {
    console.error('Webhook handler error:', err);
    // Return 200 anyway — PayPal will retry on non-2xx, and a duplicate event is now handled by idempotency
  }

  return NextResponse.json({ status: 'ok' });
}

async function handleCaptureCompleted(event: PayPalWebhookEvent) {
  const admin = createAdminClient();

  const captureId = event.resource.id;
  const orderId = event.resource.supplementary_data?.related_ids?.order_id;

  if (!orderId) {
    console.warn('PAYMENT.CAPTURE.COMPLETED with no order_id');
    return;
  }

  // Find the matching payment row
  const { data: payment } = await admin
    .from('payments')
    .select('id, user_id, kind, status, credits_granted')
    .eq('paypal_order_id', orderId)
    .maybeSingle();

  if (!payment) {
    console.warn('No payment row for PayPal order:', orderId);
    return;
  }

  if (payment.status === 'completed') {
    // Already handled by browser-side capture, nothing to do
    return;
  }

  const plan = getPlan(payment.kind as PlanKind);
  if (!plan) {
    console.error('Unknown plan kind in payment:', payment.kind);
    return;
  }

  // Grant credits + mark complete
  await grantCredits(payment.user_id, plan.credits);

  await admin
    .from('payments')
    .update({
      status: 'completed',
      credits_granted: plan.credits,
      paypal_capture_id: captureId ?? null,
      completed_at: new Date().toISOString(),
    })
    .eq('id', payment.id);
}

async function handleCaptureRefunded(event: PayPalWebhookEvent) {
  const admin = createAdminClient();

  const captureId = event.resource.id;
  if (!captureId) return;

  // Find the matching payment
  const { data: payment } = await admin
    .from('payments')
    .select('id, status')
    .eq('paypal_capture_id', captureId)
    .maybeSingle();

  if (!payment) return;

  // Mark refunded — don't deduct credits (could leave the user negative)
  // Manual reconciliation if needed.
  await admin.from('payments').update({ status: 'refunded' }).eq('id', payment.id);
}
