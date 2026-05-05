import { ImageResponse } from 'next/og';

export const alt = 'ProductShot AI — Professional product photos from a single phone shot';
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
          <svg width="36" height="36" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M16 8L17.5 13.5L23 15L17.5 16.5L16 22L14.5 16.5L9 15L14.5 13.5L16 8Z"
              fill="white"
            />
            <path
              d="M22 19L22.6 21.4L25 22L22.6 22.6L22 25L21.4 22.6L19 22L21.4 21.4L22 19Z"
              fill="white"
              opacity="0.7"
            />
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
