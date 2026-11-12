import type { Metadata, Viewport } from 'next';
import { Fraunces, Inter } from 'next/font/google';
import FlashcardsShell from '@/components/flashcards/FlashcardsShell';

const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-display', axes: ['opsz'] });
const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: { absolute: 'Flashcards' },
  description: 'Make your own flashcards and study them.',
  robots: { index: false, follow: false },
  manifest: '/flashcards/manifest.webmanifest',
  icons: { apple: { url: '/flashcards/apple-touch-icon.png', sizes: '180x180', type: 'image/png' } },
  appleWebApp: { capable: true, title: 'Flashcards', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  themeColor: '#FBF8F3',
  viewportFit: 'cover',
};

export default function FlashcardsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${fraunces.variable} ${inter.className} min-h-svh bg-cream text-ink`}
      style={{ '--accent': '#0F766E' } as React.CSSProperties}
    >
      <FlashcardsShell>{children}</FlashcardsShell>
    </div>
  );
}
