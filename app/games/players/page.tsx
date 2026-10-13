'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Eye, EyeOff, Lock, Pencil, Trash2, Trophy, UserPlus } from 'lucide-react';
import { useGames } from '@/components/games/GamesShell';
import ProfileEditor from '@/components/games/ProfileEditor';
import { useAllGames, usePlayers } from '@/components/games/hooks';
import { ConfirmDialog, Header, Loading, Page, PlayerDot } from '@/components/games/ui';
import { nextPlayerColor } from '@/lib/games/colors';
import { cleanName, findByName, MAX_NAME_LENGTH } from '@/lib/games/players';
import type { Player } from '@/lib/games/types';

export default function PlayersPage() {
  const { store, requireAdmin, isAdmin, account } = useGames();
  const players = usePlayers();
  const games = useAllGames();
  const [newName, setNewName] = useState('');
  const [addError, setAddError] = useState('');
  const [deleting, setDeleting] = useState<Player | null>(null);
  const [editing, setEditing] = useState<Player | null>(null);

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
                {...stats(p.id)}
                isSelf={account?.playerId === p.id}
                locked={account?.playerId !== p.id && !isAdmin}
                onEdit={() => (account?.playerId === p.id ? setEditing(p) : requireAdmin(() => setEditing(p)))}
                onHide={() => requireAdmin(() => store.updatePlayer(p.id, { hidden: true }))}
                onDelete={() => requireAdmin(() => setDeleting(p))}
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
                      onClick={() => requireAdmin(() => store.updatePlayer(p.id, { hidden: false }))}
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

      {editing && (
        <ProfileEditor
          player={players.find((p) => p.id === editing.id) ?? editing}
          players={players}
          isSelf={account?.playerId === editing.id}
          onSave={(patch) => store.updatePlayer(editing.id, patch)}
          onClose={() => setEditing(null)}
        />
      )}

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
  played,
  wins,
  isSelf,
  locked,
  onEdit,
  onHide,
  onDelete,
}: {
  player: Player;
  played: number;
  wins: number;
  isSelf: boolean;
  // Editing someone else needs the admin PIN; shows a lock until admin mode is on.
  locked: boolean;
  onEdit: () => void;
  onHide: () => void;
  onDelete: () => void;
}) {
  const iconButton = 'grid h-11 w-11 shrink-0 place-items-center rounded-xl text-ink/50 hover:bg-ink/5 hover:text-ink';

  return (
    <li className="rounded-2xl bg-white p-3 shadow-sm">
      <div className="flex items-center gap-3">
        <PlayerDot player={player} size="lg" />
        <Link href={`/games/player?id=${player.id}&from=players`} className="min-w-0 flex-1 rounded-lg hover:opacity-80">
          <div className="truncate font-display text-xl font-medium">
            {player.name}
            {isSelf && <span className="ml-1.5 text-base font-normal text-ink/50">(you)</span>}
          </div>
          <div className="flex items-center gap-1 text-sm text-ink/60">
            <Trophy className="h-4 w-4 text-playing" aria-hidden="true" />
            {wins} {wins === 1 ? 'win' : 'wins'} · {played} {played === 1 ? 'game' : 'games'}
          </div>
        </Link>
        <button className={`${iconButton} relative`} aria-label={isSelf ? 'Edit your profile' : `Edit ${player.name}`} onClick={onEdit}>
          <Pencil className="h-5 w-5" />
          {locked && <Lock className="absolute bottom-1.5 right-1.5 h-3 w-3 text-ink/40" aria-hidden="true" />}
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
      </div>
    </li>
  );
}
