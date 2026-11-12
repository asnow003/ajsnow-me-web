import type { Metadata, Viewport } from 'next';
import { Fraunces, Inter } from 'next/font/google';
import FlashcardsShell from '@/components/flashcards/FlashcardsShell';
import { THEME_KEY } from '@/lib/flashcards/theme-key';

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

const THEME_SCRIPT = `try{var t=localStorage.getItem('${THEME_KEY}');if(t==='light'||t==='dark')document.getElementById('fc-root').dataset.theme=t}catch(e){}`;

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FBF8F3' },
    { media: '(prefers-color-scheme: dark)', color: '#15171B' },
  ],
  viewportFit: 'cover',
};

export default function FlashcardsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      id="fc-root"
      data-theme="system"
      suppressHydrationWarning
      className={`fc-theme ${fraunces.variable} ${inter.className} min-h-svh bg-cream text-ink`}
      style={{ '--accent': '#0F766E' } as React.CSSProperties}
    >
      {/* Applies the saved appearance before the first paint, so dark mode doesn't flash light. */}
      <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      <FlashcardsShell>{children}</FlashcardsShell>
    </div>
  );
}
