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
    <span
      aria-label="Shopify"
      className="text-[#5E8E3E]"
      style={{
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontWeight: 800,
        fontSize: '1.5rem',
        letterSpacing: '-0.03em',
        lineHeight: 1,
      }}
    >
      Shopify
    </span>
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
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: '-0.45em',
          left: '5%',
          right: '5%',
          height: '0.5em',
          borderBottom: '0.18em solid #FF9900',
          borderRadius: '0 0 50% 50% / 0 0 100% 100%',
        }}
      />
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
