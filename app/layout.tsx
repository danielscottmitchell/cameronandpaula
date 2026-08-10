import type { Metadata, Viewport } from 'next';
import { Cormorant_Garamond, Jost } from 'next/font/google';
import './globals.css';

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
});

const jost = Jost({
  subsets: ['latin'],
  weight: ['300', '400'],
  variable: '--font-jost',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Cameron & Paula · October 3, 2026',
  description:
    'Cameron & Paula are getting married on October 3, 2026 at Heigh Torr Estate in Purcellville, Virginia. Kindly reply by September 1.',
  openGraph: {
    type: 'website',
    title: 'Cameron & Paula',
    description: "We're getting married — October 3, 2026. Kindly reply by September 1.",
  },
  twitter: {
    card: 'summary',
    title: 'Cameron & Paula',
    description: "We're getting married — October 3, 2026. Kindly reply by September 1.",
  },
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='14' fill='%23fdf8f5'/%3E%3Ccircle cx='16' cy='16' r='9' fill='%23c9877a'/%3E%3Ccircle cx='16' cy='16' r='5' fill='%23e0a898'/%3E%3Ccircle cx='16' cy='16' r='2' fill='%23fdf8f5'/%3E%3C/svg%3E",
  },
};

export const viewport: Viewport = {
  themeColor: '#fdf8f5',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`theme-burgundy ${cormorant.variable} ${jost.variable}`}>
      <body>
        {/* Next only renders /rsvp. The wedding site's own nav lives in the
            static page, so this is just the way back to it. */}
        <header className="site-header">
          <a className="rsvp-button" href="/">
            ← Cameron &amp; Paula
          </a>
        </header>
        {children}
      </body>
    </html>
  );
}
