'use client';

import Link from 'next/link';
import { Lock, Plus, Users } from 'lucide-react';
import { useGames } from '@/components/games/GamesShell';
import { useAllGames } from '@/components/games/hooks';
import { Header, Page } from '@/components/games/ui';
import { GAMES } from '@/lib/games/registry';

export default function GamesHome() {
  const { lock } = useGames();
  const games = useAllGames();

  return (
    <>
      <Header
        title="Family Card Games"
        right={
          <Link href="/games/players" className="flex h-10 items-center gap-2 rounded-full bg-white px-4 font-display text-lg font-medium text-brand-dark hover:bg-brand-pale">
            <Users className="h-5 w-5" aria-hidden="true" />
            <span>Players</span>
          </Link>
        }
      />
      <Page>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {GAMES.map((def) => {
            const ofType = games?.filter((g) => g.type === def.id) ?? [];
            const playing = ofType.filter((g) => g.status === 'in-progress').length;
            const played = ofType.length - playing;
            const summary = [playing && `${playing} in progress`, played && `${played} played`].filter(Boolean).join(' · ');
            return (
              <Link
                key={def.id}
                href={`/games/${def.id}`}
                className="flex min-h-[132px] flex-col justify-between rounded-3xl p-5 text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98] sm:min-h-[180px] sm:p-6"
                style={{ background: def.color }}
              >
                <def.icon className="h-8 w-8 sm:h-10 sm:w-10" aria-hidden="true" />
                <div>
                  <div className="font-display text-3xl font-semibold sm:text-4xl">{def.name}</div>
                  <div className="mt-1 h-6 text-white/90">{games ? summary || 'Not played yet' : ''}</div>
                </div>
              </Link>
            );
          })}
          <div className="hidden min-h-[180px] flex-col items-center justify-center gap-2 rounded-3xl border-[3px] border-dashed border-ink/15 text-ink/40 sm:flex">
            <Plus className="h-8 w-8" aria-hidden="true" />
            <span className="font-display text-lg">More games coming</span>
          </div>
        </div>

        <button onClick={lock} className="mx-auto mt-10 flex items-center gap-2 text-sm text-ink/50 hover:text-ink">
          <Lock className="h-4 w-4" aria-hidden="true" />
          Lock this device
        </button>
      </Page>
    </>
  );
}
