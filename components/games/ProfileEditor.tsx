'use client';

import { useEffect, useState } from 'react';
import { Check, ImageIcon, Link2, X } from 'lucide-react';
import { PLAYER_COLORS } from '@/lib/games/colors';
import { cleanName, findByName, MAX_NAME_LENGTH } from '@/lib/games/players';
import type { NewPlayer, Player } from '@/lib/games/types';
import { PlayerDot, ReadyButton } from './ui';

// Edit a player's name, color, and photo-or-initial. Opened for your own player when signed in,
// or for anyone in admin mode.
export default function ProfileEditor({
  player,
  players,
  isSelf,
  canUnlink,
  onSave,
  onClose,
}: {
  player: Player;
  players: Player[];
  isSelf: boolean;
  // Admins can unlink the player's account, freeing the player and making that account pick again.
  canUnlink: boolean;
  onSave: (patch: Partial<NewPlayer>) => Promise<void>;
  onClose: () => void;
}) {
  const [confirmUnlink, setConfirmUnlink] = useState(false);
  const [name, setName] = useState(player.name);
  const [color, setColor] = useState(player.color);
  const [usePhoto, setUsePhoto] = useState(player.usePhoto !== false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const cleaned = cleanName(name);
  const clash = cleaned ? findByName(players, cleaned) : undefined;
  const nameTaken = clash && clash.id !== player.id;
  const changed = cleaned !== player.name || color !== player.color || usePhoto !== (player.usePhoto !== false);
  const ready = cleaned.length > 0 && !nameTaken && changed;
  const preview: Player = { ...player, name: cleaned || player.name, color, usePhoto };
  // Who else uses each color, so shared colors are visible (there are more players than colors).
  const usedBy = (c: string) => players.filter((p) => p.id !== player.id && !p.hidden && p.color === c);

  const save = async () => {
    if (!ready) return;
    setBusy(true);
    try {
      await onSave({ name: cleaned, color, usePhoto });
      onClose();
    } catch {
      setError("Couldn't save. Check your connection and try again.");
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-ink/50 p-3 sm:place-items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={isSelf ? 'Your profile' : `Edit ${player.name}`}
        className="max-h-[calc(100svh-24px)] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-semibold text-ink">{isSelf ? 'Your profile' : `Edit ${player.name}`}</h2>
          <button onClick={onClose} aria-label="Close" className="grid h-10 w-10 place-items-center rounded-xl text-ink/50 hover:bg-ink/5">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-3 flex justify-center">
          <PlayerDot player={preview} size="xl" />
        </div>

        <label className="mt-4 block font-medium text-ink" htmlFor="profile-name">
          Name
        </label>
        <input
          id="profile-name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError('');
          }}
          maxLength={MAX_NAME_LENGTH}
          className="mt-1.5 h-12 w-full rounded-xl border-2 border-ink/10 px-4 text-lg outline-none focus:border-brand"
        />
        {nameTaken && <p className="mt-1.5 text-sm font-medium text-danger">{clash!.name} is already taken.</p>}

        <p className="mt-5 font-medium text-ink">Color</p>
        <div className="mt-2 grid grid-cols-6 gap-2.5">
          {PLAYER_COLORS.map((c) => {
            const others = usedBy(c);
            const on = c === color;
            return (
              <button
                key={c}
                onClick={() => setColor(c)}
                aria-pressed={on}
                aria-label={`Color ${c}${others.length ? `, also used by ${others.map((p) => p.name).join(', ')}` : ''}`}
                title={others.length ? `Also used by ${others.map((p) => p.name).join(', ')}` : undefined}
                className="mx-auto grid h-10 w-10 place-items-center rounded-full font-display text-sm font-semibold text-white transition active:scale-95"
                style={{ background: c, boxShadow: on ? `0 0 0 3px #fff, 0 0 0 5px ${c}` : undefined }}
              >
                {on ? <Check className="h-5 w-5" /> : others.length ? others[0].name.charAt(0).toUpperCase() : ''}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-ink/50">Letters show colors other players already use. You can still pick them.</p>

        {player.photoUrl ? (
          <>
            <p className="mt-5 font-medium text-ink">Show</p>
            <div className="mt-2 grid grid-cols-2 overflow-hidden rounded-xl border-2 border-ink/10" role="group" aria-label="Show photo or initial">
              {[
                { value: true, label: isSelf ? 'My photo' : 'Photo' },
                { value: false, label: 'Initial' },
              ].map((o) => (
                <button
                  key={o.label}
                  onClick={() => setUsePhoto(o.value)}
                  aria-pressed={usePhoto === o.value}
                  className={`flex h-11 items-center justify-center gap-2 font-medium ${usePhoto === o.value ? 'bg-brand text-white' : 'text-ink hover:bg-ink/5'}`}
                >
                  {o.value && <ImageIcon className="h-4 w-4" aria-hidden="true" />}
                  {o.label}
                </button>
              ))}
            </div>
          </>
        ) : (
          isSelf && (
            <p className="mt-5 text-sm text-ink/60">
              There&apos;s no photo for this account. Sign in with Google to use your Google photo.
            </p>
          )
        )}

        {player.linkedUid && (
          <div className="mt-5 rounded-2xl bg-cream p-3">
            <p className="flex items-center gap-2 font-medium text-ink">
              <Link2 className="h-4 w-4 text-ink/50" aria-hidden="true" />
              Signed-in account
            </p>
            <p className="mt-0.5 break-all text-sm text-ink/70">Linked to {player.linkedEmail ?? 'an account'}</p>
            {canUnlink &&
              (confirmUnlink ? (
                <div className="mt-3">
                  <p className="text-sm text-ink/70">
                    {isSelf ? 'You' : player.name} will be asked to pick a player again next time {isSelf ? 'you open' : 'they open'} the
                    site. {isSelf ? 'Your' : 'Their'} games and stats stay.
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => setConfirmUnlink(false)}
                      className="h-10 flex-1 rounded-xl border-2 border-ink/15 font-medium text-ink hover:bg-ink/5"
                    >
                      Keep
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await onSave({ linkedUid: null, linkedEmail: null, unlinkedAt: Date.now() });
                          onClose();
                        } catch {
                          setError("Couldn't unlink. Check your connection and try again.");
                        }
                      }}
                      className="h-10 flex-1 rounded-xl bg-danger font-medium text-white"
                    >
                      Unlink
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmUnlink(true)}
                  className="mt-2 text-sm font-medium text-danger underline hover:no-underline"
                >
                  Unlink account
                </button>
              ))}
          </div>
        )}

        {error && <p className="mt-4 font-medium text-danger">{error}</p>}
        <div className="mt-6">
          <ReadyButton ready={ready} busy={busy} onClick={save}>
            Save
          </ReadyButton>
        </div>
      </div>
    </div>
  );
}
