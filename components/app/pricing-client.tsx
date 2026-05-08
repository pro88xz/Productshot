'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  PayPalScriptProvider,
  PayPalButtons,
  type ReactPayPalScriptOptions,
} from '@paypal/react-paypal-js';
import { AlertCircle, Check, Loader2 } from 'lucide-react';

import { PLANS, type PlanKind } from '@/lib/paypal/plans';

type PricingClientProps = {
  paypalClientId: string;
};

const ONE_TIME_PLANS: PlanKind[] = ['starter_pack', 'pro_pack', 'studio_pack'];

export function PricingClient({ paypalClientId }: PricingClientProps) {
  const [activeKind, setActiveKind] = useState<PlanKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  if (!paypalClientId) {
    return (
      <div className="border-destructive/40 bg-destructive/5 text-destructive rounded-lg border p-6 text-center">
        <p>Payments are temporarily unavailable. Please try again shortly.</p>
      </div>
    );
  }

  const paypalOptions: ReactPayPalScriptOptions = {
    clientId: paypalClientId,
    currency: 'USD',
    intent: 'capture',
    components: 'buttons',
  };

  return (
    <PayPalScriptProvider options={paypalOptions}>
      <div className="grid gap-6 md:grid-cols-3">
        {ONE_TIME_PLANS.map((kind) => {
          const plan = PLANS[kind];
          const highlight = kind === 'pro_pack';

          return (
            <div
              key={kind}
              className={`relative rounded-2xl border p-6 ${
                highlight
                  ? 'border-primary bg-card shadow-primary/10 shadow-lg'
                  : 'border-border/60 bg-card'
              }`}
            >
              {highlight && (
                <span className="bg-primary text-primary-foreground absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-xs font-medium">
                  Most popular
                </span>
              )}

              <h3 className="text-lg font-semibold">{plan.name}</h3>
              <p className="text-muted-foreground mt-1 text-sm">{plan.description}</p>

              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-semibold tracking-tight">${plan.amountUsd}</span>
                <span className="text-muted-foreground text-sm">one-time</span>
              </div>

              <ul className="mt-6 space-y-3 text-sm">
                <li className="flex items-start gap-2">
                  <Check className="text-primary mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    <strong>{plan.credits}</strong> generated photos
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="text-primary mt-0.5 h-4 w-4 shrink-0" />
                  <span>All scene styles</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="text-primary mt-0.5 h-4 w-4 shrink-0" />
                  <span>High-resolution download</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="text-primary mt-0.5 h-4 w-4 shrink-0" />
                  <span>Credits never expire</span>
                </li>
              </ul>

              <div className="mt-6">
                {activeKind === kind ? (
                  <PayPalButtons
                    style={{
                      layout: 'vertical',
                      shape: 'rect',
                      label: 'pay',
                      color: 'gold',
                    }}
                    createOrder={async () => {
                      setError(null);
                      const res = await fetch('/api/paypal/create-order', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ plan_kind: kind }),
                      });
                      const data = (await res.json()) as { order_id?: string; error?: string };
                      if (!res.ok || !data.order_id) {
                        throw new Error(data.error ?? 'Could not create order');
                      }
                      return data.order_id;
                    }}
                    onApprove={async (data) => {
                      const res = await fetch('/api/paypal/capture-order', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ order_id: data.orderID }),
                      });
                      const result = (await res.json()) as {
                        status?: string;
                        error?: string;
                      };
                      if (!res.ok || result.status !== 'completed') {
                        setError(result.error ?? 'Capture failed');
                        return;
                      }
                      router.push('/pricing/success');
                      router.refresh();
                    }}
                    onError={(err) => {
                      console.error('PayPal error:', err);
                      setError('Payment could not be completed. Please try again.');
                    }}
                    onCancel={() => {
                      setActiveKind(null);
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveKind(kind)}
                    className={`w-full rounded-md py-2.5 text-sm font-medium transition-colors ${
                      highlight
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                        : 'border-border/60 bg-background text-foreground hover:bg-muted/50 border'
                    }`}
                  >
                    Buy {plan.name.toLowerCase()}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="border-destructive/40 bg-destructive/5 text-destructive mt-6 flex items-start gap-2 rounded-lg border p-4 text-sm">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {activeKind && !error && (
        <p className="text-muted-foreground mt-4 flex items-center justify-center gap-2 text-xs">
          <Loader2 className="h-3 w-3 animate-spin" />
          Loading PayPal&hellip; (popup blocked? allow popups for theproductshot.com)
        </p>
      )}
    </PayPalScriptProvider>
  );
}
