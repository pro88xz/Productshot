import Link from 'next/link';
import {
  Camera,
  Check,
  ChevronRight,
  Clock,
  ImageIcon,
  Sparkles,
  Upload,
  Wand2,
  Zap,
} from 'lucide-react';

import { createAdminClient } from '@/lib/supabase/admin';
import { FeaturedSlideshow, type FeaturedSlide } from '@/components/shared/featured-slideshow';
import { SCENE_STYLES } from '@/lib/replicate/scenes';
import {
  EtsyLogo,
  ShopifyLogo,
  AmazonWordmark,
  TikTokShopWordmark,
} from '@/components/shared/platform-logos';

import { Button } from '@/components/ui/button';
import { SiteHeader } from '@/components/shared/site-header';
import { SiteFooter } from '@/components/shared/site-footer';

export default async function HomePage() {
  const admin = createAdminClient();
  const { data: featured } = await admin
    .from('generations')
    .select('id, scene_styles, output_image_urls')
    .eq('is_featured', true)
    .eq('status', 'completed')
    .order('featured_at', { ascending: false })
    .limit(12);

  const slides: FeaturedSlide[] = (featured ?? []).flatMap((gen) => {
    const sceneIds = (gen.scene_styles as string[] | null) ?? [];
    const outputs = (gen.output_image_urls as string[] | null) ?? [];
    return outputs.map((_, i) => {
      const sceneId = sceneIds[i] ?? sceneIds[0];
      const scene = SCENE_STYLES.find((s) => s.id === sceneId);
      return {
        url: `/api/featured-image/${gen.id}/${i}`,
        alt: `Generated product photo in ${scene?.name ?? 'scene'} style`,
        label: scene?.name ?? 'Generated',
      };
    });
  });

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="gradient-radial-primary absolute inset-0" aria-hidden="true" />
          <div className="container-prose relative pt-12 pb-16 sm:pt-16 sm:pb-20 md:pt-24 md:pb-28">
            <div className="mx-auto max-w-3xl text-center">
              <div className="border-border/60 bg-background/60 text-muted-foreground inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium backdrop-blur">
                <Sparkles className="text-primary h-3 w-3" />
                <span>One photo in. Twelve studio shots out.</span>
              </div>

              <h1 className="mt-5 text-3xl leading-[1.1] font-semibold tracking-tight text-balance sm:mt-6 sm:text-5xl md:text-6xl lg:text-7xl">
                Product photos that look{' '}
                <span className="from-primary to-primary/70 bg-gradient-to-r bg-clip-text text-transparent">
                  expensive
                </span>
                . <span className="block sm:inline">Without the photo shoot.</span>
              </h1>

              <p className="text-muted-foreground mt-5 text-base text-balance sm:mt-6 sm:text-lg md:text-xl">
                Snap your product on a kitchen table. Get back a full set of studio, lifestyle, and
                editorial photos ready to list on Etsy, Shopify, Amazon, or TikTok Shop. Sixty
                seconds. No photographer required.
              </p>

              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:mt-10 sm:flex-row">
                <Button asChild size="lg" className="w-full sm:w-auto">
                  <Link href="/sign-up">
                    Generate my photos
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="lg" className="w-full sm:w-auto">
                  <Link href="/#examples">See examples</Link>
                </Button>
              </div>

              <p className="text-muted-foreground mt-5 text-sm sm:mt-6">
                3 free generations. No credit card required.
              </p>
            </div>

            {/* Hero visual placeholder */}
            <div className="relative mx-auto mt-12 max-w-5xl sm:mt-16">
              <div className="border-border/60 bg-card shadow-primary/5 aspect-[4/3] overflow-hidden rounded-xl border shadow-xl sm:aspect-[16/10] sm:rounded-2xl sm:shadow-2xl">
                {slides.length > 0 ? (
                  <FeaturedSlideshow slides={slides} />
                ) : (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/landing/vinyl-wood.jpg"
                      alt="Vinyl record on a warm wood shelf, generated from a phone photo by ProductShot"
                      className="h-full w-full object-cover"
                      loading="eager"
                      fetchPriority="high"
                    />
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Trusted by / social proof bar */}
        <section className="border-border/40 bg-muted/30 border-y">
          <div className="container-prose py-6 sm:py-8">
            <p className="text-muted-foreground text-center text-xs font-medium tracking-widest uppercase">
              Built for sellers on
            </p>
            <div className="max-w-2l mx-auto mt-6 grid grid-cols-2 items-center justify-items-center gap-x-8 gap-y-6 sm:mt-8 sm:grid-cols-4">
              <EtsyLogo />
              <ShopifyLogo />
              <AmazonWordmark />
              <TikTokShopWordmark />
            </div>
          </div>
        </section>

        {/* Problem / value */}
        <section className="container-prose py-16 sm:py-20 md:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl md:text-4xl">
              Listings live or die on the first photo.
            </h2>
            <p className="text-muted-foreground mt-5 text-base text-balance sm:mt-6 sm:text-lg">
              You know your product is good. The phone shot on your kitchen table doesn&apos;t show
              it. A real photo shoot costs $200 to $2,000 and takes a week. ProductShot gives you
              twelve professional shots in under a minute, for less than the cost of one.
            </p>
          </div>

          <div className="mx-auto mt-12 grid max-w-5xl gap-4 sm:mt-16 sm:gap-6 md:grid-cols-3">
            <div className="border-border/60 bg-card rounded-xl border p-5 sm:p-6">
              <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-lg">
                <Clock className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold">Sixty seconds, not seven days</h3>
              <p className="text-muted-foreground mt-2 text-sm">
                Upload a phone shot, get a full set of listing-ready photos before your kettle
                boils.
              </p>
            </div>

            <div className="border-border/60 bg-card rounded-xl border p-5 sm:p-6">
              <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-lg">
                <Camera className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold">Studio quality, kitchen-table effort</h3>
              <p className="text-muted-foreground mt-2 text-sm">
                Marble flatlays, wood shelves, white studio, lifestyle scenes — all generated from
                the photo you already have.
              </p>
            </div>

            <div className="border-border/60 bg-card rounded-xl border p-5 sm:p-6">
              <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-lg">
                <Zap className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold">Built for the hustle</h3>
              <p className="text-muted-foreground mt-2 text-sm">
                Pay for what you need. List the same day. Add a new SKU and do it again next week.
              </p>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section
          id="how-it-works"
          className="border-border/40 bg-muted/30 border-t py-16 sm:py-20 md:py-28"
        >
          <div className="container-prose">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-primary text-xs font-medium tracking-widest uppercase sm:text-sm">
                How it works
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-balance sm:text-3xl md:text-4xl">
                Three steps. One minute. Done.
              </h2>
            </div>

            <div className="mx-auto mt-12 grid max-w-5xl gap-4 sm:mt-16 sm:gap-6 md:grid-cols-3">
              {[
                {
                  step: '01',
                  icon: Upload,
                  title: 'Upload a phone shot',
                  description:
                    'One clear photo of your product, any background, any lighting. Phone camera is fine.',
                },
                {
                  step: '02',
                  icon: Wand2,
                  title: 'Pick your scenes',
                  description:
                    'Studio white, marble flatlay, wood shelf, lifestyle, moody, seasonal — choose what fits your brand.',
                },
                {
                  step: '03',
                  icon: ImageIcon,
                  title: 'Download the set',
                  description:
                    'Get up to twelve high-resolution photos. List them today on every store you sell on.',
                },
              ].map(({ step, icon: Icon, title, description }) => (
                <div
                  key={step}
                  className="border-border/60 bg-card relative rounded-xl border p-5 sm:p-6"
                >
                  <span className="text-primary font-mono text-xs font-medium tracking-widest">
                    {step}
                  </span>
                  <div className="bg-primary/10 text-primary mt-3 flex h-10 w-10 items-center justify-center rounded-lg">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-semibold">{title}</h3>
                  <p className="text-muted-foreground mt-2 text-sm">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Examples */}
        <section id="examples" className="container-prose py-16 sm:py-20 md:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-primary text-xs font-medium tracking-widest uppercase sm:text-sm">
              Examples
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-balance sm:text-3xl md:text-4xl">
              One photo. Every scene you can imagine.
            </h2>
            <p className="text-muted-foreground mt-5 text-base text-balance sm:mt-6 sm:text-lg">
              Same vinyl record. Three completely different aesthetics. Generated from one phone
              photo in seconds.
            </p>
          </div>
          <div className="mx-auto mt-10 grid max-w-5xl gap-4 sm:mt-12 sm:gap-6 md:grid-cols-3">
            {[
              { src: '/landing/vinyl-wood.jpg', label: 'Wood shelf' },
              { src: '/landing/vinyl-dark.jpg', label: 'Moody' },
              { src: '/landing/vinyl-white.jpg', label: 'Studio white' },
            ].map((scene) => (
              <figure
                key={scene.label}
                className="border-border/60 bg-card overflow-hidden rounded-xl border"
              >
                <div className="bg-muted/40 aspect-square overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={scene.src}
                    alt={`Vinyl record in ${scene.label} scene`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
                <figcaption className="border-border/40 border-t px-4 py-3 text-sm font-medium">
                  {scene.label}
                </figcaption>
              </figure>
            ))}
          </div>
          <p className="text-muted-foreground mt-8 text-center text-sm sm:mt-10">
            One phone photo uploaded. Three scenes generated.
          </p>
        </section>

        {/* Pricing */}
        <section
          id="pricing"
          className="border-border/40 bg-muted/30 border-t py-16 sm:py-20 md:py-28"
        >
          <div className="container-prose">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-primary text-xs font-medium tracking-widest uppercase sm:text-sm">
                Pricing
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-balance sm:text-3xl md:text-4xl">
                Pay for photos. Not subscriptions you forget about.
              </h2>
              <p className="text-muted-foreground mt-5 text-base text-balance sm:mt-6 sm:text-lg">
                Three free generations on signup. After that, buy a pack or go monthly. No
                contracts, no hidden charges.
              </p>
            </div>

            <div className="mx-auto mt-12 grid max-w-5xl gap-4 sm:mt-16 sm:gap-6 md:grid-cols-3">
              {[
                {
                  name: 'Starter',
                  price: '$9',
                  unit: 'one-time',
                  description: 'For your next listing.',
                  features: ['20 generated photos', 'All scene styles', 'High-resolution download'],
                  cta: 'Buy starter pack',
                  highlight: false,
                },
                {
                  name: 'Pro',
                  price: '$19',
                  unit: 'one-time',
                  description: 'For a full product launch.',
                  features: [
                    '50 generated photos',
                    'All scene styles',
                    'High-resolution download',
                    'Priority queue',
                  ],
                  cta: 'Buy pro pack',
                  highlight: true,
                },
                {
                  name: 'Studio',
                  price: '$39',
                  unit: '/ month',
                  description: 'For sellers shipping new SKUs constantly.',
                  features: [
                    '200 generated photos / month',
                    'All scene styles',
                    'High-resolution download',
                    'Priority queue',
                    'Cancel anytime',
                  ],
                  cta: 'Start Studio',
                  highlight: false,
                },
              ].map((plan) => (
                <div
                  key={plan.name}
                  className={`relative rounded-2xl border p-5 sm:p-6 ${
                    plan.highlight
                      ? 'border-primary bg-card shadow-primary/10 shadow-lg'
                      : 'border-border/60 bg-card'
                  }`}
                >
                  {plan.highlight && (
                    <span className="bg-primary text-primary-foreground absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-xs font-medium">
                      Most popular
                    </span>
                  )}
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  <p className="text-muted-foreground mt-1 text-sm">{plan.description}</p>
                  <div className="mt-5 flex items-baseline gap-1 sm:mt-6">
                    <span className="text-3xl font-semibold tracking-tight sm:text-4xl">
                      {plan.price}
                    </span>
                    <span className="text-muted-foreground text-sm">{plan.unit}</span>
                  </div>
                  <ul className="mt-5 space-y-2.5 text-sm sm:mt-6 sm:space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className="text-primary mt-0.5 h-4 w-4 shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    asChild
                    className="mt-6 w-full sm:mt-8"
                    variant={plan.highlight ? 'default' : 'outline'}
                  >
                    <Link href="/sign-up">{plan.cta}</Link>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="container-prose py-16 sm:py-20 md:py-28">
          <div className="mx-auto max-w-3xl">
            <div className="text-center">
              <p className="text-primary text-xs font-medium tracking-widest uppercase sm:text-sm">
                FAQ
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-balance sm:text-3xl md:text-4xl">
                Questions sellers actually ask.
              </h2>
            </div>

            <dl className="mt-10 space-y-6 sm:mt-12 sm:space-y-8">
              {[
                {
                  q: 'Will the AI keep my product looking like my product?',
                  a: 'Yes. We use product-preserving generation, which means the photo you upload is the photo you get back — same shape, same color, same details. The scene around it changes; the product stays exact.',
                },
                {
                  q: 'What does it cost to generate one set?',
                  a: 'A Starter pack ($9) covers 20 images. A Pro pack ($19) covers 50 images. Studio ($39/month) gives you 200 images monthly — best for sellers launching multiple SKUs.',
                },
                {
                  q: 'Can I use the photos on Etsy, Amazon, Shopify?',
                  a: 'Yes. You own commercial rights to every photo you generate. List them anywhere, including paid ads.',
                },
                {
                  q: 'What kind of phone photo works best?',
                  a: 'A clear, well-lit shot of your product on any background. The product should be the main subject and not blurry. That\u2019s it.',
                },
                {
                  q: 'How long does it take?',
                  a: 'Most sets generate in 30 to 60 seconds. Studio plan users skip the queue.',
                },
                {
                  q: 'Do you store my photos?',
                  a: 'Generated photos stay in your account so you can re-download them. You can delete any photo or your entire history at any time.',
                },
              ].map(({ q, a }) => (
                <div key={q} className="border-border/40 border-b pb-6 sm:pb-8">
                  <dt className="font-semibold">{q}</dt>
                  <dd className="text-muted-foreground mt-2 text-sm sm:mt-3 sm:text-base">{a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Final CTA */}
        <section className="border-border/40 bg-muted/30 border-t">
          <div className="container-prose py-16 sm:py-20 md:py-28">
            <div className="border-border/60 bg-card mx-auto max-w-3xl rounded-2xl border p-8 text-center sm:p-10 md:p-16">
              <h2 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl md:text-4xl">
                Your next listing deserves better photos.
              </h2>
              <p className="text-muted-foreground mt-5 text-base text-balance sm:mt-6 sm:text-lg">
                Three free generations. No credit card. See what your product looks like in a real
                photo studio in sixty seconds.
              </p>
              <div className="mt-8 sm:mt-10">
                <Button asChild size="lg">
                  <Link href="/sign-up">
                    Generate my first photos
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
