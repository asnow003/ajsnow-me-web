'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ChevronRight, EllipsisVertical, Eye, Plus, RotateCcw, Trash2, Trophy } from 'lucide-react';
import { useGames } from '@/components/games/GamesShell';
import { useAllGames, usePlayerMap } from '@/components/games/hooks';
import { SCORERS } from '@/components/games/scorers';
import { ConfirmDialog, Header, Loading, Page, PlayerDot, formatDateTime } from '@/components/games/ui';
import { getGameDef } from '@/lib/games/registry';
import type { Game, Player } from '@/lib/games/types';

export default function GameHistory({ type }: { type: string }) {
  const def = getGameDef(type)!;
  const { store } = useGames();
  const games = useAllGames()?.filter((g) => g.type === type);
  const players = usePlayerMap();
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Game | null>(null);

  const reopen = (game: Game) =>
    store.updateGame(game.id, { status: 'in-progress', winnerIds: [], completedAt: null, updatedAt: Date.now() });

  return (
    <>
      <Header title={def.name} back="/games" color={def.color} />
      <Page>
        <Link
          href={`/games/${type}/new`}
          className="flex h-16 items-center justify-center gap-2 rounded-2xl font-display text-2xl font-semibold text-white shadow-md transition hover:shadow-lg active:scale-[0.98] sm:ml-auto sm:w-72"
          style={{ background: def.color }}
        >
          <Plus className="h-7 w-7" aria-hidden="true" />
          New game
        </Link>

        <h2 className="mb-3 mt-8 font-display text-xl font-medium text-ink/70">History</h2>
        {!games || !players ? (
          <Loading />
        ) : games.length === 0 ? (
          <p className="rounded-2xl bg-white p-8 text-center text-ink/60 shadow-sm">
            No games yet. Start one and it&apos;ll show up here.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {games.map((game) => {
              const seated = game.playerIds.map((id) => players.get(id));
              const names = seated.map((p) => p?.name ?? 'Unknown').join(', ');
              const winners = game.winnerIds.map((id) => players.get(id)?.name ?? 'Unknown').join(' & ');
              const playing = game.status === 'in-progress';
              const summary = (
                <>
                  <Avatars players={seated} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{names}</div>
                    <div className="flex items-start gap-1 text-sm text-ink/60">
                      {playing ? (
                        <>
                          <span>
                            <span className="whitespace-nowrap">{formatDateTime(game.createdAt)}</span> ·{' '}
                            <span className="whitespace-nowrap">{progressLabel(game)}</span>
                          </span>
                        </>
                      ) : (
                        <>
                          <Trophy className="mt-0.5 h-4 w-4 shrink-0 text-playing" aria-hidden="true" />
                          <span>
                            {winners ? `${winners} won` : 'No winner'} ·{' '}
                            <span className="whitespace-nowrap">{formatDateTime(game.createdAt)}</span>
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <span
                    className={`hidden shrink-0 rounded-full px-3 py-1 text-sm font-medium sm:inline ${
                      playing ? 'bg-playing-bg text-playing-text' : 'bg-done-bg text-done-text'
                    }`}
                  >
                    {playing ? 'Playing' : 'Finished'}
                  </span>
                </>
              );

              return (
                <li
                  key={game.id}
                  className={`overflow-hidden rounded-2xl border-l-[6px] bg-white shadow-sm ${
                    playing ? 'border-playing' : 'border-done'
                  }`}
                >
                  <div className="flex items-center gap-2 p-2 pl-3">
                    {playing ? (
                      <Link
                        href={`/games/${type}/play?id=${game.id}`}
                        className="flex min-w-0 flex-1 items-center gap-3 rounded-xl py-1 hover:bg-ink/5"
                      >
                        {summary}
                        <ChevronRight className="h-5 w-5 shrink-0 text-ink/40" aria-hidden="true" />
                      </Link>
                    ) : (
                      <div className="flex min-w-0 flex-1 items-center gap-3 py-1">{summary}</div>
                    )}
                    {playing ? (
                      <IconButton label="Delete game" onClick={() => setDeleting(game)}>
                        <Trash2 className="h-5 w-5" />
                      </IconButton>
                    ) : (
                      <IconButton
                        label="More options"
                        expanded={menuFor === game.id}
                        onClick={() => setMenuFor(menuFor === game.id ? null : game.id)}
                      >
                        <EllipsisVertical className="h-5 w-5" />
                      </IconButton>
                    )}
                  </div>
                  {menuFor === game.id && (
                    <div className="flex flex-wrap gap-2 border-t border-ink/10 bg-cream/60 p-2">
                      <MenuLink href={`/games/${type}/play?id=${game.id}`} icon={Eye} label="View" />
                      <MenuButton icon={RotateCcw} label="Reopen" onClick={() => reopen(game)} />
                      <MenuButton icon={Trash2} label="Delete" danger onClick={() => setDeleting(game)} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Page>

      {deleting && (
        <ConfirmDialog
          title="Delete this game?"
          body="The game and all its scores will be gone for good."
          confirmLabel="Delete"
          danger
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            store.deleteGame(deleting.id);
            setDeleting(null);
            setMenuFor(null);
          }}
        />
      )}
    </>
  );
}

function Avatars({ players }: { players: (Player | undefined)[] }) {
  return (
    <div className="flex shrink-0 -space-x-2">
      {players.slice(0, 4).map((p, i) => (
        <PlayerDot key={i} player={p} size="sm" />
      ))}
      {players.length > 4 && (
        <span className="inline-grid h-7 w-7 place-items-center rounded-full bg-ink/10 text-xs font-medium ring-2 ring-white">
          +{players.length - 4}
        </span>
      )}
    </div>
  );
}

function IconButton({
  label,
  onClick,
  expanded,
  children,
}: {
  label: string;
  onClick: () => void;
  expanded?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-expanded={expanded}
      className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-ink/50 hover:bg-ink/5 hover:text-ink"
    >
      {children}
    </button>
  );
}

const menuItem = 'flex h-10 items-center gap-2 rounded-xl bg-white px-4 font-medium shadow-sm hover:bg-ink/5';

function MenuLink({ href, icon: Icon, label }: { href: string; icon: typeof Eye; label: string }) {
  return (
    <Link href={href} className={menuItem}>
      <Icon className="h-4 w-4" aria-hidden="true" />
      {label}
    </Link>
  );
}

function MenuButton({
  icon: Icon,
  label,
  danger,
  onClick,
}: {
  icon: typeof Eye;
  label: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className={`${menuItem} ${danger ? 'text-danger' : ''}`}>
      <Icon className="h-4 w-4" aria-hidden="true" />
      {label}
    </button>
  );
}

function progressLabel(game: Game): string {
  const scorer = SCORERS[game.type];
  const progress = scorer?.progress(game);
  if (!progress) return `round ${game.rounds.length + 1}`;
  const noun = (scorer?.roundNoun ?? 'Round').toLowerCase();
  return progress.done ? `all ${noun}s played` : `${noun} ${progress.current} of ${progress.total}`;
}
