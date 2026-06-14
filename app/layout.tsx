import type { Metadata } from 'next';
import { Crimson_Pro, Inter } from 'next/font/google';
import './globals.css';

const serif = Crimson_Pro({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-serif',
  display: 'swap',
});

const sans = Inter({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Soundtrack of Your Life',
  description: "Tell me about a moment. I'll make it into music.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`}>
      <body className="bg-ink text-paper font-serif antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
