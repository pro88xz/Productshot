import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { ThemeProvider } from '@/components/shared/theme-provider';
import './globals.css';

import { createClient } from '@/lib/supabase/server';
import { FirstPurchaseBanner } from '@/components/shared/first-purchase-banner';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://theproductshot.com';
const SITE_NAME = 'ProductShot';
const SITE_DESCRIPTION =
  'Turn one phone photo into a full set of professional product photos in seconds. Built for Etsy, Shopify, Amazon, and TikTok Shop sellers.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Professional product photos from your phone`,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    'AI product photography',
    'product photo generator',
    'Etsy product photos',
    'Shopify product photos',
    'Amazon product photos',
    'AI photo studio',
    'ecommerce photography',
    'product photo editor',
    'AI background removal',
    'product staging AI',
  ],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Professional product photos from your phone`,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} — Professional product photos from your phone`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — Professional product photos from your phone`,
    description: SITE_DESCRIPTION,
    images: ['/opengraph-image'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
  manifest: '/manifest.webmanifest',
  category: 'technology',
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  colorScheme: 'light dark',
};

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${SITE_URL}/#organization`,
  name: SITE_NAME,
  alternateName: 'theproductshot',
  url: SITE_URL,
  logo: {
    '@type': 'ImageObject',
    url: `${SITE_URL}/icon-512.png`,
    width: 512,
    height: 512,
  },
  sameAs: [],
};

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#website`,
  name: SITE_NAME,
  alternateName: 'theproductshot',
  url: SITE_URL,
  inLanguage: 'en-US',
  description: SITE_DESCRIPTION,
  publisher: {
    '@id': `${SITE_URL}/#organization`,
  },
};

const softwareApplicationSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: SITE_NAME,
  applicationCategory: 'PhotographyApplication',
  operatingSystem: 'Web',
  offers: {
    '@type': 'Offer',
    price: '9',
    priceCurrency: 'USD',
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Determine first-purchase eligibility server-side.
  // Signed-out: hasUserPurchased is undefined (generic banner shown).
  // Signed-in: true if user has bought before (banner hidden), false otherwise.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let hasUserPurchased: boolean | undefined = undefined;
  if (user) {
    const { data: credits } = await supabase
      .from('credits')
      .select('lifetime_earned')
      .eq('user_id', user.id)
      .maybeSingle();
    hasUserPurchased = (credits?.lifetime_earned ?? 0) > 3;
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationSchema),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteSchema),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(softwareApplicationSchema),
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <FirstPurchaseBanner hasUserPurchased={hasUserPurchased} />
          {children}
        </ThemeProvider>
</body>
    </html>
  );
}
