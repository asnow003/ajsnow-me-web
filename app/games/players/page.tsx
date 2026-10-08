'use client';

import { useState } from 'react';
import { Check, Eye, EyeOff, Pencil, Trash2, Trophy, UserPlus, X } from 'lucide-react';
import { useGames } from '@/components/games/GamesShell';
import { useAllGames, usePlayers } from '@/components/games/hooks';
import { ConfirmDialog, Header, Loading, Page, PlayerDot } from '@/components/games/ui';
import { nextPlayerColor } from '@/lib/games/colors';
import { cleanName, findByName, MAX_NAME_LENGTH } from '@/lib/games/players';
import type { Player } from '@/lib/games/types';

export default function PlayersPage() {
  const { store } = useGames();
  const players = usePlayers();
  const games = useAllGames();
  const [newName, setNewName] = useState('');
  const [addError, setAddError] = useState('');
  const [deleting, setDeleting] = useState<Player | null>(null);

  if (!players || !games) {
    return (
      <>
        <Header title="Players" back="/games" />
        <Loading />
      </>
    );
  }

  const stats = (id: string) => ({
    played: games.filter((g) => g.playerIds.includes(id)).length,
    wins: games.filter((g) => g.status === 'completed' && g.winnerIds.includes(id)).length,
  });

  const add = async () => {
    const name = cleanName(newName);
    if (!name) return setAddError('Enter a name.');
    const existing = findByName(players, name);
    if (existing && !existing.hidden) return setAddError(`${existing.name} is already on the list.`);
    setNewName('');
    if (existing) await store.updatePlayer(existing.id, { hidden: false });
    else await store.addPlayer({ name, color: nextPlayerColor(players.length), hidden: false, createdAt: Date.now() });
  };

  const visible = players.filter((p) => !p.hidden);
  const hidden = players.filter((p) => p.hidden);

  return (
    <>
      <Header title="Players" back="/games" />
      <Page>
        <div className="mx-auto max-w-2xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              add();
            }}
            className="flex gap-2"
          >
            <input
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                setAddError('');
              }}
              placeholder="New player's name"
              aria-label="New player's name"
              maxLength={MAX_NAME_LENGTH}
              className="h-14 min-w-0 flex-1 rounded-2xl border-2 border-ink/10 bg-white px-4 text-lg outline-none focus:border-brand"
            />
            <button className="flex h-14 items-center gap-2 rounded-2xl bg-brand px-5 font-display text-lg font-semibold text-white shadow-md active:scale-95">
              <UserPlus className="h-5 w-5" aria-hidden="true" />
              Add
            </button>
          </form>
          {addError && <p className="mt-2 font-medium text-danger">{addError}</p>}

          <ul className="mt-5 flex flex-col gap-2">
            {visible.map((p) => (
              <PlayerRow
                key={p.id}
                player={p}
                players={players}
                {...stats(p.id)}
                onRename={(name) => store.updatePlayer(p.id, { name })}
                onHide={() => store.updatePlayer(p.id, { hidden: true })}
                onDelete={() => setDeleting(p)}
              />
            ))}
            {visible.length === 0 && (
              <p className="rounded-2xl bg-white p-8 text-center text-ink/60 shadow-sm">
                Add the family above, or add players as you start games.
              </p>
            )}
          </ul>

          {hidden.length > 0 && (
            <>
              <h2 className="mb-2 mt-8 font-display text-xl font-medium text-ink/60">Hidden</h2>
              <p className="mb-3 text-sm text-ink/50">Hidden players keep their history but don&apos;t show up when starting a game.</p>
              <ul className="flex flex-col gap-2">
                {hidden.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 rounded-2xl bg-white/60 p-3 text-ink/60">
                    <PlayerDot player={{ ...p, color: '#888780' }} />
                    <span className="flex-1 font-display text-lg">{p.name}</span>
                    <button
                      onClick={() => store.updatePlayer(p.id, { hidden: false })}
                      className="flex h-10 items-center gap-2 rounded-xl px-3 font-medium text-brand hover:bg-brand-pale"
                    >
                      <Eye className="h-5 w-5" aria-hidden="true" />
                      Unhide
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </Page>

      {deleting && (
        <ConfirmDialog
          title={`Delete ${deleting.name}?`}
          body="They haven't played any games yet, so nothing else is affected."
          confirmLabel="Delete"
          danger
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            store.deletePlayer(deleting.id);
            setDeleting(null);
          }}
        />
      )}
    </>
  );
}

function PlayerRow({
  player,
  players,
  played,
  wins,
  onRename,
  onHide,
  onDelete,
}: {
  player: Player;
  players: Player[];
  played: number;
  wins: number;
  onRename: (name: string) => void;
  onHide: () => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(player.name);
  const [error, setError] = useState('');

  const save = () => {
    const name = cleanName(draft);
    if (!name) return setError('Enter a name.');
    const clash = findByName(players, name);
    if (clash && clash.id !== player.id) return setError(`${clash.name} is already taken.`);
    onRename(name);
    setEditing(false);
  };

  const iconButton = 'grid h-11 w-11 shrink-0 place-items-center rounded-xl text-ink/50 hover:bg-ink/5 hover:text-ink';

  return (
    <li className="rounded-2xl bg-white p-3 shadow-sm">
      <div className="flex items-center gap-3">
        <PlayerDot player={player} size="lg" />
        {editing ? (
          <form
            className="flex min-w-0 flex-1 items-center gap-1"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <input
              autoFocus
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setError('');
              }}
              maxLength={MAX_NAME_LENGTH}
              aria-label="Player name"
              className="h-11 min-w-0 flex-1 rounded-xl border-2 border-brand bg-white px-3 text-lg outline-none"
            />
            <button className={iconButton} aria-label="Save name">
              <Check className="h-5 w-5" />
            </button>
            <button
              type="button"
              className={iconButton}
              aria-label="Cancel"
              onClick={() => {
                setEditing(false);
                setDraft(player.name);
                setError('');
              }}
            >
              <X className="h-5 w-5" />
            </button>
          </form>
        ) : (
          <>
            <div className="min-w-0 flex-1">
              <div className="truncate font-display text-xl font-medium">{player.name}</div>
              <div className="flex items-center gap-1 text-sm text-ink/60">
                <Trophy className="h-4 w-4 text-playing" aria-hidden="true" />
                {wins} {wins === 1 ? 'win' : 'wins'} · {played} {played === 1 ? 'game' : 'games'}
              </div>
            </div>
            <button className={iconButton} aria-label={`Rename ${player.name}`} onClick={() => setEditing(true)}>
              <Pencil className="h-5 w-5" />
            </button>
            {played > 0 ? (
              <button className={iconButton} aria-label={`Hide ${player.name}`} onClick={onHide}>
                <EyeOff className="h-5 w-5" />
              </button>
            ) : (
              <button className={iconButton} aria-label={`Delete ${player.name}`} onClick={onDelete}>
                <Trash2 className="h-5 w-5" />
              </button>
            )}
          </>
        )}
      </div>
      {error && <p className="mt-2 pl-14 font-medium text-danger">{error}</p>}
    </li>
  );
}
