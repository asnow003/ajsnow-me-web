'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { ChevronDown, Crown, Flag, Radio, RotateCcw, Sparkles, Trophy } from 'lucide-react';
import { useGames } from '@/components/games/GamesShell';
import { useGame, usePlayerMap } from '@/components/games/hooks';
import { ConfirmDialog, Header, Loading, Page, PlayerDot } from '@/components/games/ui';
import { getGameDef, type GameDef } from '@/lib/games/registry';
import { leaders, totals } from '@/lib/games/scoring';
import type { Game, Player } from '@/lib/games/types';

export default function PlayGame({ type }: { type: string }) {
  const def = getGameDef(type)!;
  const id = useSearchParams().get('id') ?? '';
  const { store } = useGames();
  const game = useGame(id);
  const players = usePlayerMap();
  const [finishing, setFinishing] = useState(false);

  const back = `/games/${type}`;

  if (game === undefined || !players) {
    return (
      <>
        <Header title={def.name} back={back} color={def.color} />
        <Loading />
      </>
    );
  }

  if (game === null) {
    return (
      <>
        <Header title={def.name} back={back} color={def.color} />
        <Page>
          <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
            <p className="font-display text-2xl font-medium">This game isn&apos;t here anymore</p>
            <p className="mt-2 text-ink/60">It may have been deleted on another device.</p>
            <Link href={back} className="mt-6 inline-block rounded-xl px-6 py-3 font-display text-lg text-white" style={{ background: def.color }}>
              Back to {def.name}
            </Link>
          </div>
        </Page>
      </>
    );
  }

  const seated = game.playerIds.map((pid) => players.get(pid));
  const playing = game.status === 'in-progress';

  const reopen = () =>
    store.updateGame(game.id, { status: 'in-progress', winnerIds: [], completedAt: null, updatedAt: Date.now() });

  const finish = (winnerIds: string[]) => {
    const now = Date.now();
    store.updateGame(game.id, { status: 'completed', winnerIds, completedAt: now, updatedAt: now });
    setFinishing(false);
  };

  return (
    <>
      <Header
        title={def.name}
        back={back}
        color={def.color}
        right={
          <span className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1 font-display text-base font-medium" style={{ color: def.color }}>
            {playing ? (
              <>
                <Radio className="h-4 w-4" aria-hidden="true" />
                Round {game.rounds.length + 1}
              </>
            ) : (
              'Finished'
            )}
          </span>
        }
      />
      <Page>
        {!playing && (
          <div className="mb-5 flex flex-col items-center gap-3 rounded-3xl bg-done-bg p-5 text-done-text sm:flex-row">
            <Trophy className="h-10 w-10 shrink-0 text-playing" aria-hidden="true" />
            <div className="flex-1 text-center sm:text-left">
              <div className="font-display text-2xl font-semibold">
                {game.winnerIds.length
                  ? `${game.winnerIds.map((w) => players.get(w)?.name ?? 'Unknown').join(' & ')} won!`
                  : 'Game finished'}
              </div>
              <div className="text-done-text/80">Reopen it if a score needs fixing.</div>
            </div>
            <button onClick={reopen} className="flex h-12 items-center gap-2 rounded-xl bg-white px-5 font-display text-lg font-medium shadow-sm hover:bg-white/80">
              <RotateCcw className="h-5 w-5" aria-hidden="true" />
              Reopen game
            </button>
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
          <Scoreboard game={game} seated={seated} def={def} />

          {playing && (
            <aside className="flex flex-col gap-3">
              <div className="rounded-3xl border-[3px] border-dashed p-5 text-center" style={{ borderColor: `${def.color}55` }}>
                <Sparkles className="mx-auto h-7 w-7" style={{ color: def.color }} aria-hidden="true" />
                <p className="mt-2 font-display text-lg font-medium">{def.name} scoring is coming next</p>
                <p className="mt-1 text-sm text-ink/60">For now you can finish the game and pick the winner.</p>
              </div>
              <button
                onClick={() => setFinishing(true)}
                className="flex h-14 items-center justify-center gap-2 rounded-2xl border-[3px] bg-white font-display text-xl font-semibold shadow-sm hover:bg-ink/5"
                style={{ borderColor: def.color, color: def.color }}
              >
                <Flag className="h-6 w-6" aria-hidden="true" />
                Finish game
              </button>
            </aside>
          )}
        </div>
      </Page>

      {finishing && (
        <FinishDialog game={game} seated={seated} def={def} onCancel={() => setFinishing(false)} onFinish={finish} />
      )}
    </>
  );
}

function Scoreboard({ game, seated, def }: { game: Game; seated: (Player | undefined)[]; def: GameDef }) {
  const t = totals(game);
  const lead = new Set(leaders(game, def.winRule));
  const [open, setOpen] = useState<string | null>(null);

  return (
    <section className="rounded-3xl bg-white p-3 shadow-sm sm:p-5">
      {/* Phone: totals first, tap a player for their rounds */}
      <ul className="flex flex-col gap-2 md:hidden">
        {game.playerIds.map((pid, i) => (
          <li key={pid} className={`rounded-2xl border-2 ${lead.has(pid) ? '' : 'border-ink/10'}`} style={lead.has(pid) ? { borderColor: def.color } : undefined}>
            <button
              onClick={() => setOpen(open === pid ? null : pid)}
              aria-expanded={open === pid}
              className="flex w-full items-center gap-3 p-3 text-left"
            >
              <PlayerDot player={seated[i]} />
              <span className="flex min-w-0 flex-1 items-center gap-1.5 font-display text-xl font-medium">
                <span className="truncate">{seated[i]?.name ?? 'Unknown'}</span>
                {lead.has(pid) && <Crown className="h-5 w-5 shrink-0" style={{ color: def.color }} aria-label="Leading" />}
              </span>
              <span className="font-display text-3xl font-semibold tabular-nums">{t[pid]}</span>
              <ChevronDown className={`h-5 w-5 text-ink/40 transition ${open === pid ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
            {open === pid && (
              <div className="border-t border-ink/10 px-4 py-2 text-ink/70">
                {game.rounds.length === 0
                  ? 'No rounds yet'
                  : game.rounds.map((r, n) => (
                      <div key={n} className="flex justify-between py-0.5 tabular-nums">
                        <span>Round {n + 1}</span>
                        <span>{r.scores[pid] ?? 0}</span>
                      </div>
                    ))}
              </div>
            )}
          </li>
        ))}
      </ul>

      {/* Tablet and up: the full round-by-round table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full table-fixed text-center tabular-nums">
          <thead>
            <tr>
              <th className="w-20 pb-3 text-left text-sm font-normal text-ink/50">Round</th>
              {game.playerIds.map((pid, i) => (
                <th key={pid} className="min-w-[90px] pb-3 font-normal">
                  <div className="flex flex-col items-center gap-1">
                    <PlayerDot player={seated[i]} size="lg" />
                    <span className="max-w-full truncate font-display text-lg font-medium">{seated[i]?.name ?? 'Unknown'}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-lg">
            {game.rounds.map((r, n) => (
              <tr key={n} className="border-t border-ink/10">
                <td className="py-2 text-left text-ink/50">{n + 1}</td>
                {game.playerIds.map((pid) => (
                  <td key={pid} className="py-2">{r.scores[pid] ?? 0}</td>
                ))}
              </tr>
            ))}
            {game.rounds.length === 0 && (
              <tr className="border-t border-ink/10">
                <td colSpan={game.playerIds.length + 1} className="py-6 text-ink/50">No rounds yet</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-ink/20">
              <td className="pt-3 text-left text-sm text-ink/50">Total</td>
              {game.playerIds.map((pid) => (
                <td key={pid} className="pt-3">
                  <span
                    className="inline-flex items-center gap-1 font-display text-3xl font-semibold"
                    style={lead.has(pid) ? { color: def.color } : undefined}
                  >
                    {lead.has(pid) && <Crown className="h-6 w-6" aria-label="Leading" />}
                    {t[pid]}
                  </span>
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}

function FinishDialog({
  game,
  seated,
  def,
  onCancel,
  onFinish,
}: {
  game: Game;
  seated: (Player | undefined)[];
  def: GameDef;
  onCancel: () => void;
  onFinish: (winnerIds: string[]) => void;
}) {
  const t = totals(game);
  const [picked, setPicked] = useState<string[]>(() => leaders(game, def.winRule));
  const [error, setError] = useState('');

  return (
    <ConfirmDialog
      title="Who won?"
      body={`${def.winRule === 'high' ? 'Highest' : 'Lowest'} total wins in ${def.name}. Change it if the scores don't tell the whole story.`}
      confirmLabel="Finish game"
      onCancel={onCancel}
      onConfirm={() => (picked.length ? onFinish(picked) : setError('Pick at least one winner.'))}
    >
      <div className="mt-4 flex flex-col gap-2">
        {game.playerIds.map((pid, i) => {
          const on = picked.includes(pid);
          return (
            <button
              key={pid}
              onClick={() => {
                setError('');
                setPicked((p) => (on ? p.filter((x) => x !== pid) : [...p, pid]));
              }}
              aria-pressed={on}
              className={`flex items-center gap-3 rounded-2xl border-2 p-3 text-left ${on ? 'bg-playing-bg' : 'border-ink/10'}`}
              style={on ? { borderColor: '#EF9F27' } : undefined}
            >
              <PlayerDot player={seated[i]} />
              <span className="flex-1 font-display text-lg font-medium">{seated[i]?.name ?? 'Unknown'}</span>
              <span className="tabular-nums text-ink/60">{t[pid]}</span>
              <Trophy className={`h-6 w-6 ${on ? 'text-playing' : 'text-ink/15'}`} aria-hidden="true" />
            </button>
          );
        })}
      </div>
      {error && <p className="mt-3 font-medium text-danger">{error}</p>}
    </ConfirmDialog>
  );
}
