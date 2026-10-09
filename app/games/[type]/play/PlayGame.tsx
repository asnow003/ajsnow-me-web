'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { ChevronDown, Crown, Flag, Pencil, Radio, RotateCcw, Sparkles, Trophy } from 'lucide-react';
import { useGames } from '@/components/games/GamesShell';
import { useGame, usePlayerMap } from '@/components/games/hooks';
import { RulesCard } from '@/components/games/RulesCard';
import { SCORERS, type GameScorer } from '@/components/games/scorers';
import { ConfirmDialog, Header, Loading, Page, PlayerDot } from '@/components/games/ui';
import { getGameDef, type GameDef } from '@/lib/games/registry';
import { leaders, totals } from '@/lib/games/scoring';
import type { Game, Player, Round } from '@/lib/games/types';

export default function PlayGame({ type }: { type: string }) {
  const def = getGameDef(type)!;
  const id = useSearchParams().get('id') ?? '';
  const { store, isAdmin, requireAdmin } = useGames();
  const game = useGame(id);
  const players = usePlayerMap();
  const [finishing, setFinishing] = useState(false);
  const [editRound, setEditRound] = useState<number | null>(null);
  const scorer = SCORERS[type];

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

  const saveRounds = (rounds: Round[]) => store.updateGame(game.id, { rounds, updatedAt: Date.now() });

  const progress = scorer?.progress(game);
  const noun = scorer?.roundNoun ?? 'Round';
  // Ending before the last round is quitting; the game is still saved as finished.
  const quitting = Boolean(progress && !progress.done);

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
            {!playing ? (
              'Finished'
            ) : progress?.done ? (
              `All ${noun.toLowerCase()}s done`
            ) : (
              <>
                <Radio className="h-4 w-4" aria-hidden="true" />
                {noun} {progress ? `${progress.current} of ${progress.total}` : game.rounds.length + 1}
              </>
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
            <button onClick={() => requireAdmin(reopen)} className="flex h-12 items-center gap-2 rounded-xl bg-white px-5 font-display text-lg font-medium shadow-sm hover:bg-white/80">
              <RotateCcw className="h-5 w-5" aria-hidden="true" />
              Reopen game
            </button>
          </div>
        )}

        {/* While playing on wider screens, round entry sits on the left and the scoreboard on the right. */}
        <div className={`grid gap-5 lg:items-start ${playing ? 'lg:grid-cols-[360px_minmax(0,1fr)]' : ''}`}>
          <div className={`flex flex-col gap-5 ${playing ? 'lg:col-start-2 lg:row-span-2 lg:row-start-1' : ''}`}>
            <Scoreboard
              game={game}
              seated={seated}
              def={def}
              scorer={scorer}
              onEditRound={playing && scorer ? (i) => requireAdmin(() => setEditRound(i)) : undefined}
              editNeedsAdmin={!isAdmin}
            />
            {scorer?.Rules && (
              <RulesCard>
                <scorer.Rules />
              </RulesCard>
            )}
          </div>

          {playing && (
            <aside className="order-first lg:order-none lg:col-start-1 lg:row-start-1">
              {scorer ? (
                <scorer.Panel
                  game={game}
                  def={def}
                  players={players}
                  editRound={editRound}
                  onDoneEditing={() => setEditRound(null)}
                  saveRounds={saveRounds}
                  onAllRoundsDone={() => setFinishing(true)}
                />
              ) : (
                <div className="rounded-3xl border-[3px] border-dashed p-5 text-center" style={{ borderColor: `${def.color}55` }}>
                  <Sparkles className="mx-auto h-7 w-7" style={{ color: def.color }} aria-hidden="true" />
                  <p className="mt-2 font-display text-lg font-medium">{def.name} scoring is coming next</p>
                  <p className="mt-1 text-sm text-ink/60">For now you can finish the game and pick the winner.</p>
                </div>
              )}
            </aside>
          )}

          {playing && (
            <button
              onClick={() => setFinishing(true)}
              className="flex h-14 items-center justify-center gap-2 rounded-2xl border-[3px] bg-white font-display text-xl font-semibold shadow-sm hover:bg-ink/5 lg:col-start-1 lg:row-start-2"
              style={{ borderColor: def.color, color: def.color }}
            >
              <Flag className="h-6 w-6" aria-hidden="true" />
              {quitting ? 'Quit game' : 'Finish game'}
            </button>
          )}
        </div>
      </Page>

      {finishing && (
        <FinishDialog
          game={game}
          seated={seated}
          def={def}
          quitting={quitting}
          onCancel={() => setFinishing(false)}
          onFinish={finish}
        />
      )}
    </>
  );
}

function Scoreboard({
  game,
  seated,
  def,
  scorer,
  onEditRound,
  editNeedsAdmin,
}: {
  game: Game;
  seated: (Player | undefined)[];
  def: GameDef;
  scorer?: GameScorer;
  onEditRound?: (index: number) => void;
  editNeedsAdmin?: boolean;
}) {
  const t = totals(game);
  const lead = new Set(leaders(game, def.winRule));
  const [open, setOpen] = useState<string | null>(null);
  const last = game.rounds[game.rounds.length - 1];
  const live = scorer && last && !scorer.canEdit(last) ? last : null;
  const editable = (r: Round) => Boolean(onEditRound && scorer?.canEdit(r));
  const noun = (scorer?.roundNoun ?? 'Round').toLowerCase();

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
              {live && <span className="text-sm text-ink/60">{scorer!.cell(live, pid).detail}</span>}
              <span className="font-display text-3xl font-semibold tabular-nums">{t[pid]}</span>
              <ChevronDown className={`h-5 w-5 text-ink/40 transition ${open === pid ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
            {open === pid && (
              <div className="border-t border-ink/10 px-4 py-2 text-ink/70">
                {game.rounds.length === 0
                  ? 'No rounds yet'
                  : game.rounds.map((r, n) => {
                      const c = scorer?.cell(r, pid);
                      return (
                        <button
                          key={n}
                          disabled={!editable(r)}
                          onClick={() => onEditRound?.(n)}
                          className="flex w-full items-center gap-2 rounded-lg px-1 py-1 text-left tabular-nums enabled:hover:bg-ink/5"
                        >
                          <span className="flex-1">
                            {scorer?.roundNoun ?? 'Round'} {scorer ? scorer.roundLabel(r, n) : n + 1}
                          </span>
                          {c?.detail && <span className="text-sm text-ink/50">{c.detail}</span>}
                          <span className="w-10 text-right font-medium text-ink">{c ? (c.score ?? '') : (r.scores[pid] ?? 0)}</span>
                          {editable(r) && <Pencil className="h-3.5 w-3.5 text-ink/30" aria-hidden="true" />}
                        </button>
                      );
                    })}
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
              <th className="w-20 pb-3 text-left text-sm font-normal text-ink/50">{scorer?.roundNoun ?? 'Round'}</th>
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
              <tr
                key={n}
                onClick={editable(r) ? () => onEditRound?.(n) : undefined}
                title={editable(r) ? 'Tap to correct this round' : undefined}
                className={`border-t border-ink/10 ${editable(r) ? 'cursor-pointer hover:bg-cream' : ''} ${r === live ? 'bg-cream' : ''}`}
              >
                <td className="py-2 text-left text-ink/50">{scorer ? scorer.roundLabel(r, n) : n + 1}</td>
                {game.playerIds.map((pid) => {
                  const c = scorer?.cell(r, pid);
                  return (
                    <td key={pid} className="py-2">
                      {c ? (
                        c.score === null ? (
                          <span className="text-base text-ink/60">{c.detail}</span>
                        ) : (
                          <>
                            {c.score} {c.detail && <span className="text-sm text-ink/40">{c.detail}</span>}
                          </>
                        )
                      ) : (
                        (r.scores[pid] ?? 0)
                      )}
                    </td>
                  );
                })}
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
      {onEditRound && game.rounds.some(editable) && (
        <p className="mt-3 text-center text-sm text-ink/50">
          <span className="md:hidden">Tap a player to see their {noun}s, then tap one to correct it.</span>
          <span className="hidden md:inline">Tap a {noun} to correct it.</span>
          {editNeedsAdmin && ' Needs the admin PIN.'}
        </p>
      )}
    </section>
  );
}

function FinishDialog({
  game,
  seated,
  def,
  quitting,
  onCancel,
  onFinish,
}: {
  game: Game;
  seated: (Player | undefined)[];
  def: GameDef;
  quitting: boolean;
  onCancel: () => void;
  onFinish: (winnerIds: string[]) => void;
}) {
  const t = totals(game);
  const [picked, setPicked] = useState<string[]>(() => leaders(game, def.winRule));
  const [error, setError] = useState('');

  return (
    <ConfirmDialog
      title={quitting ? 'Quit this game?' : 'Who won?'}
      body={
        quitting
          ? "It'll be saved as finished where you stopped. Pick who won, or leave everyone unselected for no winner."
          : `${def.winRule === 'high' ? 'Highest' : 'Lowest'} total wins in ${def.name}. Change it if the scores don't tell the whole story.`
      }
      confirmLabel={quitting ? 'Quit game' : 'Finish game'}
      onCancel={onCancel}
      onConfirm={() => (picked.length || quitting ? onFinish(picked) : setError('Pick at least one winner.'))}
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
