import { ImageResponse } from 'next/og';

export const alt = 'ProductShot — Professional product photos from your phone';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background:
          'radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.22) 0%, rgba(10, 10, 10, 1) 70%)',
        color: 'white',
        fontFamily: 'system-ui, sans-serif',
        padding: '80px',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: '18px',
          marginBottom: '40px',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            background: '#4F46E5',
            borderRadius: '14px',
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
            fontSize: '40px',
            fontWeight: 600,
            letterSpacing: '-0.02em',
          }}
        >
          ProductShot
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '16px',
          fontSize: '76px',
          fontWeight: 600,
          letterSpacing: '-0.04em',
          lineHeight: 1.05,
          textAlign: 'center',
          maxWidth: '950px',
        }}
      >
        <span style={{ display: 'flex' }}>Product photos that look</span>
        <span style={{ display: 'flex', color: '#818cf8' }}>expensive.</span>
      </div>

      <div
        style={{
          display: 'flex',
          fontSize: '32px',
          color: 'rgba(255,255,255,0.7)',
          marginTop: '32px',
          textAlign: 'center',
          maxWidth: '850px',
          lineHeight: 1.3,
        }}
      >
        One phone photo in. Twelve studio shots out.
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: '28px',
          marginTop: '60px',
          fontSize: '22px',
          color: 'rgba(255,255,255,0.5)',
        }}
      >
        <span style={{ display: 'flex' }}>Etsy</span>
        <span style={{ display: 'flex' }}>·</span>
        <span style={{ display: 'flex' }}>Shopify</span>
        <span style={{ display: 'flex' }}>·</span>
        <span style={{ display: 'flex' }}>Amazon</span>
        <span style={{ display: 'flex' }}>·</span>
        <span style={{ display: 'flex' }}>TikTok Shop</span>
      </div>
    </div>,
    { ...size },
  );
}
