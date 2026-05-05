import type { Metadata } from 'next';
import Link from 'next/link';

import { SiteHeader } from '@/components/shared/site-header';
import { SiteFooter } from '@/components/shared/site-footer';

export const metadata: Metadata = {
  title: 'Refund Policy',
  description: 'Our refund policy for ProductShot AI. Honest, fair, and clear.',
  alternates: { canonical: '/refund' },
};

export default function RefundPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <article className="container-prose py-16 md:py-24">
          <div className="mx-auto max-w-3xl">
            <p className="text-muted-foreground text-sm">Last updated: May 5, 2026</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
              Refund Policy
            </h1>
            <p className="text-muted-foreground mt-6 text-lg">
              We want you to feel good about buying. Here&apos;s when we refund and when we
              don&apos;t.
            </p>

            <div className="prose prose-neutral dark:prose-invert mt-12 max-w-none space-y-10">
              <section>
                <h2 className="text-2xl font-semibold tracking-tight">Free trial first</h2>
                <p className="text-muted-foreground mt-4">
                  Every new account gets 3 free generations before paying anything. Use them to
                  decide if ProductShot is right for you. We strongly recommend trying the free
                  generations before buying any pack or subscription.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold tracking-tight">
                  Credit packs (Starter, Pro)
                </h2>
                <p className="text-muted-foreground mt-4">
                  Credit packs are non-refundable once you&apos;ve used any of the credits. If you
                  bought a pack and haven&apos;t used a single credit, email us within 7 days of
                  purchase and we&apos;ll refund in full.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold tracking-tight">Studio subscription</h2>
                <p className="text-muted-foreground mt-4">
                  Cancel anytime from your dashboard. Your subscription stays active until the end
                  of the billing period you&apos;ve already paid for. We don&apos;t pro-rate refunds
                  for partial months.
                </p>
                <p className="text-muted-foreground mt-4">
                  If you forget to cancel and get charged for a month you didn&apos;t intend to use,
                  email us within 7 days and we&apos;ll usually refund — provided the credits for
                  that month are mostly unused.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold tracking-tight">When something goes wrong</h2>
                <p className="text-muted-foreground mt-4">
                  If the service is down, generations fail, or you receive obviously broken output
                  that we can&apos;t fix by regenerating, email us and we&apos;ll credit your
                  account or refund as appropriate. We&apos;d rather make it right than have you
                  feel cheated.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold tracking-tight">How to request a refund</h2>
                <p className="text-muted-foreground mt-4">
                  Email{' '}
                  <Link href="mailto:hello@productshot.ai" className="text-foreground underline">
                    hello@productshot.ai
                  </Link>{' '}
                  with the email address on your account and what you&apos;d like refunded. We reply
                  within 2 business days.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold tracking-tight">Chargebacks</h2>
                <p className="text-muted-foreground mt-4">
                  Please email us before filing a chargeback. We can almost always resolve issues
                  faster than your bank can. Filing a chargeback without contacting us first will
                  result in account suspension.
                </p>
              </section>
            </div>
          </div>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
