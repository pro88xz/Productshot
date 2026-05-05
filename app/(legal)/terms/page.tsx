import type { Metadata } from 'next';
import Link from 'next/link';

import { SiteHeader } from '@/components/shared/site-header';
import { SiteFooter } from '@/components/shared/site-footer';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'The rules of using ProductShot AI. Plain English, no fine print traps.',
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <article className="container-prose py-16 md:py-24">
          <div className="mx-auto max-w-3xl">
            <p className="text-muted-foreground text-sm">Last updated: May 5, 2026</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
              Terms of Service
            </h1>
            <p className="text-muted-foreground mt-6 text-lg">
              By using ProductShot AI, you agree to these terms. We&apos;ve kept them short and
              honest.
            </p>

            <div className="prose prose-neutral dark:prose-invert mt-12 max-w-none space-y-10">
              <section>
                <h2 className="text-2xl font-semibold tracking-tight">What we offer</h2>
                <p className="text-muted-foreground mt-4">
                  ProductShot AI takes a photo you upload and generates new photos of the same
                  product in different scenes using AI image generation. You buy credits or
                  subscribe and use them to generate photos.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold tracking-tight">Who can use it</h2>
                <p className="text-muted-foreground mt-4">
                  You must be at least 16 years old. You must have the right to upload the photos
                  you upload — meaning you took them yourself, you own the product, or you have
                  permission from the person who did. Don&apos;t upload photos of people without
                  their consent.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold tracking-tight">
                  What you can do with the output
                </h2>
                <p className="text-muted-foreground mt-4">
                  You own the photos you generate. Use them for product listings, paid ads,
                  marketing, social posts — anywhere, including commercially. We don&apos;t take a
                  cut and we don&apos;t restrict where they go.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold tracking-tight">What you can&apos;t do</h2>
                <ul className="text-muted-foreground mt-4 space-y-2">
                  <li>Generate photos of products that are illegal to sell.</li>
                  <li>
                    Generate photos to mislead consumers (e.g., faking a product you don&apos;t
                    actually sell).
                  </li>
                  <li>Generate sexually explicit content.</li>
                  <li>
                    Try to generate photos of real people, celebrities, copyrighted characters, or
                    branded logos that aren&apos;t yours.
                  </li>
                  <li>Resell the service or wrap it in your own product without our permission.</li>
                </ul>
                <p className="text-muted-foreground mt-4">
                  If we detect abuse, we may suspend or terminate your account. We try to email you
                  first, but we reserve the right to act first when needed.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold tracking-tight">Credits and subscriptions</h2>
                <p className="text-muted-foreground mt-4">
                  Credit packs are one-time purchases. Subscriptions renew monthly until canceled.
                  Cancel from your dashboard anytime. Unused credits stay on your account.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold tracking-tight">Refunds</h2>
                <p className="text-muted-foreground mt-4">
                  See our{' '}
                  <Link href="/refund" className="text-foreground underline">
                    refund policy
                  </Link>
                  .
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold tracking-tight">Service availability</h2>
                <p className="text-muted-foreground mt-4">
                  We aim for high uptime but we don&apos;t guarantee zero downtime. If the service
                  goes down for an extended period, we&apos;ll credit affected accounts.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold tracking-tight">No warranty for AI output</h2>
                <p className="text-muted-foreground mt-4">
                  AI-generated photos may sometimes look weird, off, or wrong. We work hard to make
                  this rare. But we can&apos;t guarantee every photo will be perfect. If a
                  generation is unusable, you can regenerate using more credits, or contact us —
                  we&apos;ll often make it right.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold tracking-tight">Liability</h2>
                <p className="text-muted-foreground mt-4">
                  Our liability to you is limited to what you&apos;ve paid us in the past 12 months.
                  We&apos;re not liable for indirect damages (lost profits, business interruption,
                  etc.). This is standard for SaaS but worth saying clearly.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold tracking-tight">Changes</h2>
                <p className="text-muted-foreground mt-4">
                  If we change these terms in a meaningful way, we&apos;ll email you and you can
                  cancel without penalty.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold tracking-tight">Contact</h2>
                <p className="text-muted-foreground mt-4">
                  Anything unclear? Email{' '}
                  <Link href="mailto:hello@productshot.ai" className="text-foreground underline">
                    hello@productshot.ai
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
