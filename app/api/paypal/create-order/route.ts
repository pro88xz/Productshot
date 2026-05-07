import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import {
  CheckoutPaymentIntent,
  OrderApplicationContextLandingPage,
  OrderApplicationContextUserAction,
  type OrderRequest,
} from '@paypal/paypal-server-sdk';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { paypalOrders } from '@/lib/paypal/client';
import { getPlan } from '@/lib/paypal/plans';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://theproductshot.com';

const requestSchema = z.object({
  plan_kind: z.enum(['starter_pack', 'pro_pack']),
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
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
  }

  const plan = getPlan(parsed.data.plan_kind);
  if (!plan || plan.isSubscription) {
    return NextResponse.json(
      { error: 'Plan not available for one-time purchase' },
      { status: 400 },
    );
  }

  // Reuse a recent pending order for this user + plan if one exists (within 15 minutes)
  const adminEarly = createAdminClient();
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { data: reusablePayment } = await adminEarly
    .from('payments')
    .select('paypal_order_id')
    .eq('user_id', user.id)
    .eq('kind', plan.kind)
    .eq('status', 'pending')
    .gte('created_at', fifteenMinutesAgo)
    .not('paypal_order_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (reusablePayment?.paypal_order_id) {
    return NextResponse.json({ order_id: reusablePayment.paypal_order_id });
  }

  // Create the PayPal order
  const orderBody: OrderRequest = {
    intent: CheckoutPaymentIntent.Capture,
    purchaseUnits: [
      {
        amount: {
          currencyCode: 'USD',
          value: plan.amountUsd,
        },
        description: plan.description,
        customId: `${user.id}|${plan.kind}`,
      },
    ],
    applicationContext: {
      brandName: 'ProductShot',
      landingPage: OrderApplicationContextLandingPage.NoPreference,
      userAction: OrderApplicationContextUserAction.PayNow,
      returnUrl: `${SITE_URL}/pricing/success`,
      cancelUrl: `${SITE_URL}/pricing`,
    },
  };

  try {
    const { result, statusCode } = await paypalOrders.createOrder({
      body: orderBody,
      prefer: 'return=representation',
    });

    if (statusCode !== 200 && statusCode !== 201) {
      console.error('PayPal createOrder non-success status:', statusCode);
      return NextResponse.json({ error: 'Could not create order' }, { status: 500 });
    }

    if (!result.id) {
      return NextResponse.json({ error: 'PayPal returned no order id' }, { status: 500 });
    }

    // Track the pending payment
    const admin = createAdminClient();
    const { error: insertError } = await admin.from('payments').insert({
      user_id: user.id,
      kind: plan.kind,
      status: 'pending',
      amount_cents: plan.amountCents,
      currency: 'USD',
      credits_granted: 0, // granted on capture
      paypal_order_id: result.id,
      metadata: { plan_credits: plan.credits },
    });

    if (insertError) {
      console.error('Failed to record pending payment:', insertError);
      // Don't fail the order — we'll reconcile via webhook
    }

    return NextResponse.json({ order_id: result.id });
  } catch (err) {
    console.error('PayPal createOrder error:', err);
    return NextResponse.json({ error: 'Could not create order' }, { status: 500 });
  }
}
