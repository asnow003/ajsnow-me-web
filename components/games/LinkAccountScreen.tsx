'use client';

import { useEffect, useState } from 'react';
import { UserPlus } from 'lucide-react';
import { nextPlayerColor } from '@/lib/games/colors';
import { derivePinKey } from '@/lib/games/pin';
import { cleanName, findByName, linkedToSomeoneElse, MAX_NAME_LENGTH } from '@/lib/games/players';
import type { AuthUser, Backend } from '@/lib/games/store';
import type { Player } from '@/lib/games/types';
import PinPad from './PinPad';
import { PlayerDot, ReadyButton } from './ui';

// The family PIN proves the account belongs to the family, then the person picks (or adds) their player.
// After that, signing in alone is enough on any device. An account an admin unlinks comes back here (with
// a notice) and enters the PIN again, so changing the PIN keeps unlinked accounts out.
export default function LinkAccountScreen({
  backend,
  user,
  notice,
  onLinked,
  onCancel,
}: {
  backend: Backend;
  user: AuthUser;
  notice?: string;
  onLinked: (familyId: string, playerId: string) => void;
  onCancel: () => void;
}) {
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>();
  const [picked, setPicked] = useState<string | 'new' | null>(null);
  const [newName, setNewName] = useState(user.displayName ?? user.email?.split('@')[0] ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!familyId) return;
    return backend.family(familyId).subscribePlayers(
      (all) => setPlayers(all.filter((p) => !p.hidden).sort((a, b) => a.name.localeCompare(b.name))),
      () => setError("Couldn't load the players. Check your connection."),
    );
  }, [backend, familyId]);

  const checkPin = async (pin: string) => {
    const id = await backend.lookupPin(await derivePinKey(pin));
    if (id) setFamilyId(id);
    return Boolean(id);
  };

  const name = cleanName(newName);
  const clash = picked === 'new' && players ? findByName(players, name) : undefined;
  const ready = picked !== null && (picked !== 'new' || (name.length > 0 && !clash));

  const link = async () => {
    if (!familyId || !ready || !players) return;
    setBusy(true);
    setError('');
    try {
      const store = backend.family(familyId);
      const playerId =
        picked === 'new'
          ? await store.addPlayer({
              name,
              color: nextPlayerColor(players.length),
              photoUrl: user.photoUrl,
              linkedUid: user.uid,
              linkedEmail: user.email,
              hidden: false,
              createdAt: Date.now(),
            })
          : picked!;
      if (picked !== 'new') {
        await store.updatePlayer(playerId, {
          linkedUid: user.uid,
          linkedEmail: user.email,
          ...(user.photoUrl && { photoUrl: user.photoUrl }),
        });
      }
      await backend.setMember(user.uid, { familyId, playerId, linkedAt: Date.now() });
      onLinked(familyId, playerId);
    } catch {
      setError("Couldn't link your account. Check your connection and try again.");
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-svh items-center justify-center bg-cream px-4 py-6">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-lg">
        <h1 className="font-display text-3xl font-semibold text-ink">{notice ? 'Pick your player' : 'Welcome!'}</h1>
        <p className="mt-1 text-ink/70">
          {notice ?? (
            <>
              One-time setup for <span className="font-medium text-ink">{user.email ?? 'your account'}</span>.
            </>
          )}
        </p>

        {!familyId ? (
          <>
            <p className="mb-4 mt-5 font-medium text-ink">Enter the family PIN</p>
            <PinPad onSubmit={checkPin} variant="light" />
          </>
        ) : (
          <>
            <p className="mb-3 mt-5 font-medium text-ink">Which player are you?</p>
            {!players ? (
              <p className="text-ink/50">Loading players…</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {players.map((p) => {
                  const taken = linkedToSomeoneElse(p, user.uid);
                  return (
                    <button
                      key={p.id}
                      onClick={() => setPicked(p.id)}
                      disabled={taken}
                      aria-pressed={picked === p.id}
                      title={taken ? `${p.name} is already linked to another account` : undefined}
                      className={`flex h-11 items-center gap-2 rounded-full pl-1 pr-4 font-display text-lg font-medium transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-45 disabled:active:scale-100 ${
                        picked === p.id ? 'text-white shadow-md' : 'border-2 border-ink/10 text-ink hover:border-ink/25'
                      }`}
                      style={picked === p.id ? { background: p.color } : undefined}
                    >
                      <PlayerDot player={p} size="sm" />
                      {p.name}
                      {taken && <span className="text-xs font-normal text-ink/60">Linked</span>}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPicked('new')}
                  aria-pressed={picked === 'new'}
                  className={`flex h-11 items-center gap-2 rounded-full border-2 border-dashed px-4 font-display text-lg font-medium ${
                    picked === 'new' ? 'border-brand bg-brand-pale text-brand-dark' : 'border-ink/20 text-ink/60 hover:border-ink/40'
                  }`}
                >
                  <UserPlus className="h-5 w-5" aria-hidden="true" />
                  Add me
                </button>
              </div>
            )}
            {players?.some((p) => linkedToSomeoneElse(p, user.uid)) && (
              <p className="mt-3 text-sm text-ink/50">
                Greyed-out players are linked to another account. If that&apos;s wrong, an admin can unlink them.
              </p>
            )}
            {picked === 'new' && (
              <>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  maxLength={MAX_NAME_LENGTH}
                  placeholder="Your name"
                  aria-label="Your name"
                  className="mt-3 h-12 w-full rounded-xl border-2 border-ink/10 px-4 text-lg outline-none focus:border-brand"
                />
                {clash && (
                  <p className="mt-2 text-sm font-medium text-danger">{clash.name} is already on the list. Pick them instead.</p>
                )}
              </>
            )}
            {error && <p className="mt-3 font-medium text-danger">{error}</p>}
            <div className="mt-5">
              <ReadyButton ready={ready} busy={busy} onClick={link}>
                Link my account
              </ReadyButton>
            </div>
          </>
        )}

        <button onClick={onCancel} className="mx-auto mt-4 block text-sm text-ink/60 underline hover:text-ink">
          Cancel and sign out
        </button>
      </div>
    </main>
  );
}
