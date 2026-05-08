import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ChevronRight } from 'lucide-react';

import { getAllPostsMeta } from '@/lib/blog';
import { SiteHeader } from '@/components/shared/site-header';
import { SiteFooter } from '@/components/shared/site-footer';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://theproductshot.com';

export const metadata: Metadata = {
  title: 'Blog — ProductShot',
  description:
    'Tips, guides, and insights for sellers using ProductShot to make better product photos with their phone.',
  alternates: { canonical: '/blog' },
  openGraph: {
    title: 'Blog — ProductShot',
    description:
      'Tips, guides, and insights for sellers using ProductShot to make better product photos with their phone.',
    url: `${SITE_URL}/blog`,
    type: 'website',
  },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function BlogIndexPage() {
  const posts = getAllPostsMeta();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="container-prose py-12 md:py-20">
          <div className="mx-auto max-w-3xl">
            <Link
              href="/"
              className="text-muted-foreground hover:text-foreground -ml-1 inline-flex items-center gap-1 text-sm transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Home
            </Link>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">Blog</h1>
            <p className="text-muted-foreground mt-3 text-base sm:text-lg">
              Practical guides for making better product photos with your phone.
            </p>

            {posts.length === 0 ? (
              <div className="border-border/60 from-primary/5 via-card to-card mt-12 rounded-xl border bg-gradient-to-br p-10 text-center">
                <p className="text-base font-semibold">No posts yet</p>
                <p className="text-muted-foreground mt-2 text-sm">
                  We&apos;re writing the first one. Check back soon.
                </p>
              </div>
            ) : (
              <div className="mt-12 space-y-8">
                {posts.map((post) => (
                  <article
                    key={post.slug}
                    className="border-border/60 hover:border-primary/40 group rounded-xl border p-6 transition-colors sm:p-8"
                  >
                    <Link href={`/blog/${post.slug}`} className="block">
                      <p className="text-muted-foreground text-xs">
                        {formatDate(post.frontmatter.publishedAt)}
                      </p>
                      <h2 className="group-hover:text-primary mt-2 text-xl font-semibold tracking-tight transition-colors sm:text-2xl">
                        {post.frontmatter.title}
                      </h2>
                      <p className="text-muted-foreground mt-3 text-sm sm:text-base">
                        {post.frontmatter.description}
                      </p>
                      <span className="text-primary mt-4 inline-flex items-center gap-1 text-sm font-medium">
                        Read more
                        <ChevronRight className="h-4 w-4" />
                      </span>
                    </Link>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
