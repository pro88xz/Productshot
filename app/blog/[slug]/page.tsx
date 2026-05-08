import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { getAllPostSlugs, getPostBySlug } from '@/lib/blog';
import { SiteHeader } from '@/components/shared/site-header';
import { SiteFooter } from '@/components/shared/site-footer';
import { Button } from '@/components/ui/button';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://theproductshot.com';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return getAllPostSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) {
    return { title: 'Post not found' };
  }

  const url = `${SITE_URL}/blog/${slug}`;
  return {
    title: `${post.frontmatter.title} — ProductShot`,
    description: post.frontmatter.description,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      title: post.frontmatter.title,
      description: post.frontmatter.description,
      url,
      type: 'article',
      publishedTime: post.frontmatter.publishedAt,
      modifiedTime: post.frontmatter.updatedAt ?? post.frontmatter.publishedAt,
      authors: post.frontmatter.author ? [post.frontmatter.author] : undefined,
      tags: post.frontmatter.tags,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.frontmatter.title,
      description: post.frontmatter.description,
    },
  };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.frontmatter.title,
    description: post.frontmatter.description,
    datePublished: post.frontmatter.publishedAt,
    dateModified: post.frontmatter.updatedAt ?? post.frontmatter.publishedAt,
    author: {
      '@type': 'Organization',
      name: 'ProductShot',
      url: SITE_URL,
    },
    publisher: {
      '@type': 'Organization',
      name: 'ProductShot',
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/icon.svg`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${SITE_URL}/blog/${slug}`,
    },
  };

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <article className="container-prose py-12 md:py-20">
          <div className="mx-auto max-w-3xl">
            <Link
              href="/blog"
              className="text-muted-foreground hover:text-foreground -ml-1 inline-flex items-center gap-1 text-sm transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              All posts
            </Link>

            <header className="mt-6">
              <p className="text-muted-foreground text-xs">
                {formatDate(post.frontmatter.publishedAt)}
                {post.frontmatter.author && <> · By {post.frontmatter.author}</>}
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance md:text-4xl lg:text-5xl">
                {post.frontmatter.title}
              </h1>
              <p className="text-muted-foreground mt-4 text-base text-balance sm:text-lg">
                {post.frontmatter.description}
              </p>
            </header>

            <div
              className="prose prose-neutral dark:prose-invert prose-headings:font-semibold prose-headings:tracking-tight prose-a:text-primary mt-12 max-w-none"
              dangerouslySetInnerHTML={{ __html: post.htmlContent }}
            />

            <div className="border-primary/30 from-primary/5 to-primary/10 mt-16 rounded-2xl border bg-gradient-to-br p-8 text-center">
              <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                Ready to try ProductShot?
              </h2>
              <p className="text-muted-foreground mt-3 text-sm sm:text-base">
                Three free generations on signup. No credit card required.
              </p>
              <Button asChild size="lg" className="mt-6">
                <Link href="/sign-up">Generate my photos</Link>
              </Button>
            </div>
          </div>
        </article>
      </main>
      <SiteFooter />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
    </div>
  );
}
