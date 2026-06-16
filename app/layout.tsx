import type { Metadata, Viewport } from 'next';
import { Crimson_Pro, Fraunces, Inter } from 'next/font/google';
import './globals.css';

// Body italic — Crimson Pro (existing)
const serif = Crimson_Pro({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-serif',
  display: 'swap',
});

// All-caps labels — Inter (existing)
const sans = Inter({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-sans',
  display: 'swap',
});

// Display headings — Fraunces (new)
// Variable axes: SOFT for softer terminals, opsz for optical sizing.
// Use class `font-display` and toggle quirky alternates via the `.wonk` class
// (style sets ss01 / ss02 wake the curlier letterforms).
const display = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  axes: ['SOFT', 'opsz'],
  display: 'swap',
});

const SITE_URL = 'https://soundtrack.irina.love';
const SITE_TITLE = 'Soundtrack of Your Life';
const SITE_DESCRIPTION =
  "Tell me about a moment. I'll make it into music — a custom lo-fi/ambient track with a cinematic cover and a poetic title.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: '%s — Soundtrack of Your Life',
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    siteName: SITE_TITLE,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  creator: 'irina.love',
  authors: [{ name: 'Irina Csapo', url: 'https://irina.love' }],
};

export const viewport: Viewport = {
  themeColor: '#0E0D11',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${serif.variable} ${sans.variable} ${display.variable}`}
    >
      <body className="bg-ink text-paper font-serif antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
