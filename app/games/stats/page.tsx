'use client';

import { useState } from 'react';
import { Trophy } from 'lucide-react';
import { useAllGames, usePlayers } from '@/components/games/hooks';
import { Header, Loading, Page, PlayerDot } from '@/components/games/ui';
import { GAMES } from '@/lib/games/registry';
import type { Player } from '@/lib/games/types';

interface Row {
  player: Player;
  played: number;
  wins: number;
  rank: number;
}

// Only finished games count. On a tie every tied winner gets the win.
export default function StatsPage() {
  const games = useAllGames();
  const players = usePlayers();
  const [filter, setFilter] = useState<string>('all');

  if (!games || !players) {
    return (
      <>
        <Header title="Stats" back="/games" />
        <Loading />
      </>
    );
  }

  const finished = games.filter((g) => g.status === 'completed' && (filter === 'all' || g.type === filter));
  const sorted = players
    .map((player) => ({
      player,
      played: finished.filter((g) => g.playerIds.includes(player.id)).length,
      wins: finished.filter((g) => g.winnerIds.includes(player.id)).length,
    }))
    .filter((r) => r.played > 0)
    .sort((a, b) => b.wins - a.wins || b.wins / b.played - a.wins / a.played || a.player.name.localeCompare(b.player.name));
  // Players with the same number of wins share a place.
  const rows: Row[] = sorted.map((r) => ({ ...r, rank: sorted.findIndex((x) => x.wins === r.wins) + 1 }));
  const mostWins = Math.max(1, ...rows.map((r) => r.wins));
  const active = GAMES.find((g) => g.id === filter);
  const accent = active?.color ?? '#534AB7';

  return (
    <>
      <Header title="Stats" back="/games" />
      <Page>
        <div className="mx-auto max-w-3xl">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Which games">
            {[{ id: 'all', name: 'All games', color: '#534AB7' }, ...GAMES].map((g) => (
              <button
                key={g.id}
                onClick={() => setFilter(g.id)}
                aria-pressed={filter === g.id}
                className={`h-11 rounded-full px-5 font-display text-lg font-medium transition active:scale-95 ${
                  filter === g.id ? 'text-white shadow-md' : 'border-2 border-ink/10 bg-white text-ink hover:border-ink/25'
                }`}
                style={filter === g.id ? { background: g.color } : undefined}
              >
                {g.name}
              </button>
            ))}
          </div>

          <p className="mb-4 mt-5 text-ink/60">
            {finished.length} finished {finished.length === 1 ? 'game' : 'games'}
            {active ? ` of ${active.name}` : ''}
          </p>

          {rows.length === 0 ? (
            <p className="rounded-2xl bg-white p-8 text-center text-ink/60 shadow-sm">
              No finished {active ? `${active.name} ` : ''}games yet. Wins show up here once a game is finished.
            </p>
          ) : (
            <ol className="flex flex-col gap-2">
              {rows.map((r) => (
                <li key={r.player.id} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm sm:gap-4 sm:p-4">
                  <span
                    className={`w-7 shrink-0 text-center font-display text-xl font-semibold ${r.rank === 1 && r.wins > 0 ? '' : 'text-ink/40'}`}
                    style={r.rank === 1 && r.wins > 0 ? { color: accent } : undefined}
                  >
                    {r.rank === 1 && r.wins > 0 ? <Trophy className="mx-auto h-6 w-6" aria-label="First place" /> : r.rank}
                  </span>
                  <PlayerDot player={r.player} size="lg" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className={`truncate font-display text-xl font-medium ${r.player.hidden ? 'text-ink/50' : ''}`}>
                        {r.player.name}
                      </span>
                      <span className="shrink-0 font-display text-2xl font-semibold tabular-nums">
                        {r.wins}
                        <span className="ml-1 text-sm font-normal text-ink/50">{r.wins === 1 ? 'win' : 'wins'}</span>
                      </span>
                    </div>
                    <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-ink/5">
                      <div
                        className="h-full rounded-full transition-[width] duration-500"
                        style={{ width: `${(r.wins / mostWins) * 100}%`, background: r.player.color }}
                      />
                    </div>
                    <div className="mt-1 text-sm text-ink/60">
                      {r.played} {r.played === 1 ? 'game' : 'games'} · {Math.round((r.wins / r.played) * 100)}% won
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </Page>
    </>
  );
}
