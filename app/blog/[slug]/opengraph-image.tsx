import { ImageResponse } from 'next/og';

import { getPostBySlug } from '@/lib/blog';

export const alt = 'ProductShot Blog';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function BlogOgImage({ params }: Props) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  const title = post?.frontmatter.title ?? 'ProductShot Blog';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background:
            'radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.22) 0%, rgba(10, 10, 10, 1) 70%)',
          color: 'white',
          fontFamily: 'system-ui, sans-serif',
          padding: '80px',
        }}
      >
        {/* Header: lens + brand */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '18px',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              background: '#4F46E5',
              borderRadius: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="48" height="48" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="16" r="12" fill="none" stroke="white" strokeWidth="3" />
              <circle cx="16" cy="16" r="5" fill="white" />
            </svg>
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: '36px',
              fontWeight: 600,
              letterSpacing: '-0.02em',
            }}
          >
            ProductShot
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: '24px',
              color: 'rgba(255,255,255,0.5)',
              marginLeft: '8px',
            }}
          >
            · Blog
          </div>
        </div>

        {/* Spacer */}
        <div style={{ flex: 1, display: 'flex' }} />

        {/* Post title */}
        <div
          style={{
            display: 'flex',
            fontSize: title.length > 80 ? '52px' : '64px',
            fontWeight: 600,
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
            color: 'white',
            maxWidth: '1040px',
          }}
        >
          {title}
        </div>

        {/* Bottom tag */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '12px',
            marginTop: '40px',
            fontSize: '24px',
            color: 'rgba(255,255,255,0.6)',
          }}
        >
          <span style={{ display: 'flex' }}>theproductshot.com</span>
          <span style={{ display: 'flex' }}>·</span>
          <span style={{ display: 'flex' }}>For Etsy, Shopify & TikTok Shop sellers</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
