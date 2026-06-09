import type { Metadata, Viewport } from 'next';
import { Heebo, Oswald } from 'next/font/google';
import './globals.css';
import ServiceWorker from '@/components/ServiceWorker';

const heebo = Heebo({
  subsets: ['hebrew', 'latin'],
  weight: ['400', '500', '700', '800', '900'],
  variable: '--font-heebo',
  display: 'swap',
});

// Athletic condensed display face for English movement names, numbers and
// format badges — gives the WOD board its sporty CrossFit character.
const oswald = Oswald({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-oswald',
  display: 'swap',
});

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

export const metadata: Metadata = {
  title: 'CrossFit BUX — האפליקציה',
  description:
    'אפליקציית CrossFit BUX יהוד: האימון היומי, מחולל אימונים, הזנת תוצאות ומעקב שיאים. 🦌',
  manifest: `${basePath}/manifest.json`,
  applicationName: 'CrossFit BUX',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'CrossFit BUX',
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
    <html lang="he" dir="rtl" className={`${heebo.variable} ${oswald.variable}`}>
      <body
        style={{
          // wire next/font into our Tailwind --font-app var
          // (Heebo .variable sets --font-heebo, Oswald sets --font-oswald)
          ['--font-app' as any]: 'var(--font-heebo), system-ui, sans-serif',
        }}
      >
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
