import type { Metadata, Viewport } from 'next';
import './globals.css';
import ServiceWorker from '@/components/ServiceWorker';

// Fonts are loaded via a plain stylesheet link (below) rather than
// next/font/google, so a transient Google Fonts hiccup can never fail the
// build. The --font-heebo / --font-oswald CSS vars are defined in globals.css.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

export const metadata: Metadata = {
  title: 'BUX WOD — מחולל אימונים',
  description:
    'מחולל אימוני CrossFit של CrossFit BUX — אימון מלא בכל מקום, עם סרטוני הדגמה לכל תרגיל. 🦌',
  manifest: `${basePath}/manifest.json`,
  applicationName: 'BUX WOD',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'BUX WOD',
  },
  icons: {
    icon: `${basePath}/icons/icon-192.png`,
    apple: `${basePath}/icons/icon-192.png`,
  },
};

export const viewport: Viewport = {
  themeColor: '#1E4D2B',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;700;800;900&family=Oswald:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
