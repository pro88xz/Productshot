/**
 * Pricing plans for ProductShot AI.
 * Server-side source of truth — never trust prices from the client.
 */

export type PlanKind = 'starter_pack' | 'pro_pack' | 'studio_pack';

export type Plan = {
  kind: PlanKind;
  name: string;
  description: string;
  amountUsd: string; // PayPal expects strings like "9.00"
  amountCents: number; // for our payments table
  credits: number;
  isSubscription: boolean;
};

export const PLANS: Record<PlanKind, Plan> = {
  starter_pack: {
    kind: 'starter_pack',
    name: 'Starter pack',
    description: '20 credits — for your next listing',
    amountUsd: '9.00',
    amountCents: 900,
    credits: 20,
    isSubscription: false,
  },
  pro_pack: {
    kind: 'pro_pack',
    name: 'Pro pack',
    description: '50 credits — for a full product launch',
    amountUsd: '19.00',
    amountCents: 1900,
    credits: 50,
    isSubscription: false,
  },
  studio_pack: {
    kind: 'studio_pack',
    name: 'Studio pack',
    description: '200 credits — for sellers shipping new SKUs constantly',
    amountUsd: '39.00',
    amountCents: 3900,
    credits: 200,
    isSubscription: false,
  },
};

export function getPlan(kind: string): Plan | undefined {
  if (kind in PLANS) {
    return PLANS[kind as PlanKind];
  }
  return undefined;
}
