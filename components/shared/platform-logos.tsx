'use client';

/**
 * Platform logos/wordmarks for the "Built for sellers on" section.
 * Etsy & Shopify use official public brand assets (allowed for integrations).
 * Amazon & TikTok are rendered as styled text (avoids trademark issues).
 */

export function EtsyLogo() {
  return (
    <span
      aria-label="Etsy"
      className="text-[#F1641E]"
      style={{
        fontFamily: '"Guardian Egyp Text", Georgia, serif',
        fontWeight: 800,
        fontSize: '1.75rem',
        letterSpacing: '-0.02em',
        lineHeight: 1,
      }}
    >
      Etsy
    </span>
  );
}

export function ShopifyLogo() {
  return (
    <div className="flex items-center gap-2">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 36 40"
        aria-hidden="true"
        className="h-8 w-8"
      >
        <path
          fill="#95BF47"
          d="M35.3 8.6c0-.3-.3-.5-.5-.5l-4.1-.3-3-3c-.2-.2-.7-.1-.9-.1l-1.5.5C24.6 2.3 23-.3 20.1 0c0 0-.1 0-.1.1-.2-.3-.5-.6-.9-.9-1.7-1.5-4.1-1.1-5.8.3-2 1.7-3.6 4.9-4 7.6-1.9.6-3.3 1-3.5 1.1-1.1.3-1.1.3-1.3 1.5C4.4 11.3 1 44.8 1 44.8L29.1 50l12.2-2.7c.1 0-6-35.7-6-38.7z"
        />
        <path
          fill="#5E8E3E"
          d="M29.1 50L41.3 47.3s-5.8-35.7-5.9-38.7c0-.3-.3-.5-.5-.5L30.3 8V50h-1.2z"
        />
        <path
          fill="#fff"
          d="M23.1 16.5L21.6 21s-1.3-.6-2.9-.5c-2.4.2-2.5 1.7-2.5 2.1.1 2.2 5.9 2.7 6.2 7.9.2 4.1-2.2 6.9-5.8 7.1-4.2.3-6.6-2.2-6.6-2.2l1-4s2.4 1.8 4.4 1.7c1.2-.1 1.8-1.1 1.7-1.8-.2-2.9* 2.9+-3-3.2-6.9-7.3-1.2-5.2 1.3-10.6 7.9-11.4 1.9-.3 2.9.1 2.9.1z"
        />
      </svg>
      <span
        className="text-foreground"
        style={{
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontWeight: 700,
          fontSize: '1.25rem',
          letterSpacing: '-0.02em',
        }}
      >
        Shopify
      </span>
    </div>
  );
}

export function AmazonWordmark() {
  return (
    <span
      aria-label="Amazon"
      className="relative inline-flex items-center text-[#FF9900]"
      style={{
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontWeight: 800,
        fontSize: '1.5rem',
        letterSpacing: '-0.03em',
        lineHeight: 1,
      }}
    >
      amazon
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 54 12"
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: '-0.4em',
          left: '0.1em',
          right: '0.1em',
          height: '0.5em',
        }}
      >
        <path
          fill="none"
          stroke="#FF9900"
          strokeWidth="3"
          strokeLinecap="round"
          d="M1 9c4 4 11 7 26 7s22-3 26-7"
        />
      </svg>
    </span>
  );
}

export function TikTokShopWordmark() {
  return (
    <span aria-label="TikTok Shop" className="inline-flex items-center gap-1.5">
      <span
        className="text-foreground relative"
        style={{
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontWeight: 800,
          fontSize: '1.375rem',
          letterSpacing: '-0.03em',
          lineHeight: 1,
          textShadow: '0.06em 0.06em 0 #FE2C55, -0.06em -0.06em 0 #25F4EE',
        }}
      >
        TikTok
      </span>
      <span
        className="text-muted-foreground"
        style={{
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontWeight: 500,
          fontSize: '0.875rem',
          letterSpacing: '0.01em',
        }}
      >
        Shop
      </span>
    </span>
  );
}
