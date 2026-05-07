import type { Metadata } from 'next';
import Link from 'next/link';

import { SiteHeader } from '@/components/shared/site-header';
import { SiteFooter } from '@/components/shared/site-footer';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How ProductShot collects, uses, and protects your data. Plain English, no surprises.',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <article className="container-prose py-16 md:py-24">
          <div className="mx-auto max-w-3xl">
            <p className="text-muted-foreground text-sm">Last updated: May 5, 2026</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
              Privacy Policy
            </h1>
            <p className="text-muted-foreground mt-6 text-lg">
              We try to keep this readable. If anything is unclear, email{' '}
              <Link href="mailto:hello@theproductshot.com" className="text-foreground underline">
                hello@theproductshot.com
              </Link>{' '}
              and we&apos;ll explain.
            </p>

            <div className="prose prose-neutral dark:prose-invert mt-12 max-w-none space-y-10">
              <section>
                <h2 className="text-2xl font-semibold tracking-tight">What we collect</h2>
                <p className="text-muted-foreground mt-4">
                  When you sign up, we store your email address and a hashed version of your
                  password (or your magic link token if you use passwordless sign-in). When you
                  generate photos, we store the photo you uploaded and the photos we generated. When
                  you pay, we receive a confirmation from PayPal — we never see your card or bank
                  details.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold tracking-tight">
                  What we don&apos;t collect
                </h2>
                <p className="text-muted-foreground mt-4">
                  We don&apos;t use third-party advertising trackers. We don&apos;t sell your data.
                  We don&apos;t train AI models on your photos. We don&apos;t share your generated
                  images with anyone.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold tracking-tight">
                  How we use what we collect
                </h2>
                <ul className="text-muted-foreground mt-4 space-y-2">
                  <li>To generate the photos you ask for.</li>
                  <li>To deliver receipts and account emails (via Resend).</li>
                  <li>To prevent abuse — flagging unusual usage patterns.</li>
                  <li>To improve the product based on aggregate usage trends.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold tracking-tight">Who we share data with</h2>
                <p className="text-muted-foreground mt-4">
                  We use a small number of vendors to run the service: Supabase (database),
                  Replicate (AI image generation), PayPal (payments), Resend (email), Vercel
                  (hosting). They process data only to provide their service to us. We don&apos;t
                  share your data with anyone else.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold tracking-tight">Your rights</h2>
                <p className="text-muted-foreground mt-4">
                  You can delete any photo, your generation history, or your entire account at any
                  time from your dashboard. If you delete your account, we delete all your data
                  within 30 days, except records we&apos;re legally required to keep (like payment
                  records for tax purposes).
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold tracking-tight">Cookies</h2>
                <p className="text-muted-foreground mt-4">
                  We use a single cookie to keep you signed in. We don&apos;t use advertising
                  cookies or third-party tracking.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold tracking-tight">Children</h2>
                <p className="text-muted-foreground mt-4">
                  ProductShot is not intended for use by anyone under 16. We don&apos;t knowingly
                  collect data from children.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold tracking-tight">Changes</h2>
                <p className="text-muted-foreground mt-4">
                  If we update this policy in a meaningful way, we&apos;ll email you. The latest
                  version always lives here.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold tracking-tight">Contact</h2>
                <p className="text-muted-foreground mt-4">
                  Questions, complaints, or data requests: email{' '}
                  <Link
                    href="mailto:hello@theproductshot.com"
                    className="text-foreground underline"
                  >
                    hello@theproductshot.com
                  </Link>
                  .
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
