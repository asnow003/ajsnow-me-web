import type { Metadata, Viewport } from 'next';
import { Fredoka } from 'next/font/google';
import GamesShell from '@/components/games/GamesShell';

const fredoka = Fredoka({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-fredoka' });

export const metadata: Metadata = {
  title: { absolute: 'Family Card Games' },
  description: 'Scorekeeping for our family card games.',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: '#534AB7',
};

export default function GamesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${fredoka.variable} min-h-dvh bg-cream text-ink`}>
      <GamesShell>{children}</GamesShell>
    </div>
  );
}
