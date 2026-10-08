'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { ChevronRight, Radio, Trophy } from 'lucide-react';
import { useAllGames, usePlayerMap } from '@/components/games/hooks';
import { SCORERS } from '@/components/games/scorers';
import { Header, Loading, Page, PlayerDot, formatDateTime } from '@/components/games/ui';
import { GAMES, getGameDef } from '@/lib/games/registry';
import { hasScores, totals } from '@/lib/games/scoring';
import type { Game } from '@/lib/games/types';

const BACK: Record<string, string> = { stats: '/games/stats', players: '/games/players' };

export default function PlayerDetail() {
  const params = useSearchParams();
  const id = params.get('id') ?? '';
  const back = BACK[params.get('from') ?? ''] ?? '/games/players';
  const games = useAllGames();
  const players = usePlayerMap();
  const [filter, setFilter] = useState('all');

  if (!games || !players) {
    return (
      <>
        <Header title="Player" back={back} />
        <Loading />
      </>
    );
  }

  const player = players.get(id);
  if (!player) {
    return (
      <>
        <Header title="Player" back={back} />
        <Page>
          <p className="rounded-3xl bg-white p-8 text-center text-ink/60 shadow-sm">This player isn&apos;t on the list anymore.</p>
        </Page>
      </>
    );
  }

  const theirs = games.filter((g) => g.playerIds.includes(id));
  const finished = theirs.filter((g) => g.status === 'completed');
  const wins = finished.filter((g) => g.winnerIds.includes(id)).length;
  const shown = theirs.filter((g) => filter === 'all' || g.type === filter);

  return (
    <>
      <Header title={player.name} back={back} color={player.color} />
      <Page>
        <div className="mx-auto max-w-3xl">
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <Stat label={wins === 1 ? 'Win' : 'Wins'} value={wins} color={player.color} />
            <Stat label="Finished" value={finished.length} />
            <Stat label="Won" value={finished.length ? `${Math.round((wins / finished.length) * 100)}%` : '–'} />
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2 sm:gap-3">
            {GAMES.map((def) => {
              const done = finished.filter((g) => g.type === def.id);
              const won = done.filter((g) => g.winnerIds.includes(id)).length;
              // Best total from games with scores entered: highest for Estimation, lowest for Golf.
              const scored = done.filter(hasScores).map((g) => ({ g, total: totals(g)[id] }));
              const best = scored.length
                ? scored.reduce((a, b) => ((def.winRule === 'high' ? b.total > a.total : b.total < a.total) ? b : a))
                : null;
              const noun = SCORERS[def.id]?.roundNoun?.toLowerCase() ?? 'round';
              return (
                <div key={def.id} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white" style={{ background: def.color }}>
                    <def.icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-display text-lg font-medium">{def.name}</div>
                    <div className="text-sm text-ink/60">
                      {done.length === 0
                        ? 'No finished games'
                        : `${won} of ${done.length} won${
                            best ? ` · best ${best.total}${def.id === 'golf' ? ` (${best.g.rounds.length} ${noun}s)` : ''}` : ''
                          }`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mb-3 mt-8 flex flex-wrap items-center gap-2">
            <h2 className="mr-auto font-display text-xl font-medium text-ink/70">Games</h2>
            {[{ id: 'all', name: 'All', color: player.color }, ...GAMES].map((g) => (
              <button
                key={g.id}
                onClick={() => setFilter(g.id)}
                aria-pressed={filter === g.id}
                className={`h-9 rounded-full px-4 font-display font-medium transition active:scale-95 ${
                  filter === g.id ? 'text-white shadow' : 'border-2 border-ink/10 bg-white text-ink hover:border-ink/25'
                }`}
                style={filter === g.id ? { background: g.color } : undefined}
              >
                {g.name}
              </button>
            ))}
          </div>

          {shown.length === 0 ? (
            <p className="rounded-2xl bg-white p-8 text-center text-ink/60 shadow-sm">
              No games yet. Games {player.name} plays will show up here.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {shown.map((g) => (
                <GameRow key={g.id} game={g} playerId={id} players={players} />
              ))}
            </ul>
          )}
        </div>
      </Page>
    </>
  );
}

function Stat({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div className="rounded-2xl bg-white p-3 text-center shadow-sm sm:p-4">
      <div className="font-display text-3xl font-semibold tabular-nums sm:text-4xl" style={color ? { color } : undefined}>
        {value}
      </div>
      <div className="text-sm text-ink/60">{label}</div>
    </div>
  );
}

function GameRow({ game, playerId, players }: { game: Game; playerId: string; players: ReturnType<typeof usePlayerMap> & {} }) {
  const def = getGameDef(game.type);
  if (!def) return null;
  const playing = game.status === 'in-progress';
  const won = game.winnerIds.includes(playerId);
  const others = game.playerIds.filter((p) => p !== playerId);
  const scorer = SCORERS[game.type];
  const progress = scorer?.progress(game);
  const total = hasScores(game) ? totals(game)[playerId] : null;
  const winners = game.winnerIds.map((w) => players.get(w)?.name ?? 'Unknown').join(' & ');

  return (
    <li>
      <Link
        href={`/games/${game.type}/play?id=${game.id}`}
        className="flex items-center gap-3 rounded-2xl border-l-[6px] bg-white p-3 shadow-sm hover:bg-white/70"
        style={{ borderColor: def.color }}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-display text-lg font-medium">{def.name}</span>
            <span className="text-sm text-ink/50">{formatDateTime(game.createdAt)}</span>
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-sm text-ink/60">
            {others.length > 0 && (
              <span className="flex -space-x-1.5">
                {others.slice(0, 5).map((p) => (
                  <PlayerDot key={p} player={players.get(p)} size="sm" />
                ))}
              </span>
            )}
            <span className="truncate">
              {playing ? (
                <span className="inline-flex items-center gap-1">
                  <Radio className="h-3.5 w-3.5" aria-hidden="true" />
                  {progress ? `${scorer?.roundNoun ?? 'Round'} ${progress.current} of ${progress.total}` : 'In progress'}
                </span>
              ) : won ? null : winners ? (
                `${winners} won`
              ) : (
                'Finished'
              )}
            </span>
          </div>
        </div>
        {total !== null && (
          <div className="text-right">
            <div className="font-display text-2xl font-semibold tabular-nums">{total}</div>
            <div className="text-xs text-ink/50">points</div>
          </div>
        )}
        {won && (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-playing-bg px-3 py-1 text-sm font-medium text-playing-text">
            <Trophy className="h-4 w-4" aria-hidden="true" />
            Won
          </span>
        )}
        <ChevronRight className="h-5 w-5 shrink-0 text-ink/30" aria-hidden="true" />
      </Link>
    </li>
  );
}
