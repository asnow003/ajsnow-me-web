'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Check, Search, UserPlus } from 'lucide-react';
import { useGames } from '@/components/games/GamesShell';
import { usePlayers } from '@/components/games/hooks';
import { Header, Loading, Page, PlayerDot } from '@/components/games/ui';
import { nextPlayerColor } from '@/lib/games/colors';
import { cleanName, findByName } from '@/lib/games/players';
import { getGameDef } from '@/lib/games/registry';

export default function NewGame({ type }: { type: string }) {
  const def = getGameDef(type)!;
  const router = useRouter();
  const { store } = useGames();
  const players = usePlayers();
  const [seats, setSeats] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!players) {
    return (
      <>
        <Header title={`New ${def.name} game`} back={`/games/${type}`} color={def.color} />
        <Loading />
      </>
    );
  }

  const toggle = (id: string) => {
    setError('');
    setSeats((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };

  const name = cleanName(query);
  const match = name ? findByName(players, name) : undefined;
  const shown = players.filter(
    (p) => (!p.hidden || seats.includes(p.id)) && p.name.toLowerCase().includes(name.toLowerCase()),
  );

  const addOrPick = async () => {
    if (!name) return;
    setQuery('');
    if (match) {
      if (match.hidden) await store.updatePlayer(match.id, { hidden: false });
      if (!seats.includes(match.id)) toggle(match.id);
      return;
    }
    const id = await store.addPlayer({
      name,
      color: nextPlayerColor(players.length),
      hidden: false,
      createdAt: Date.now(),
    });
    setSeats((s) => [...s, id]);
  };

  const start = async () => {
    if (seats.length < 2) {
      setError('Pick at least 2 players.');
      return;
    }
    setBusy(true);
    const now = Date.now();
    try {
      const id = await store.createGame({
        type,
        status: 'in-progress',
        playerIds: seats,
        rounds: [],
        winnerIds: [],
        createdAt: now,
        updatedAt: now,
        completedAt: null,
      });
      router.push(`/games/${type}/play?id=${id}`);
    } catch {
      setError("Couldn't start the game. Check your connection and try again.");
      setBusy(false);
    }
  };

  const byId = new Map(players.map((p) => [p.id, p]));

  return (
    <>
      <Header title={`New ${def.name} game`} back={`/games/${type}`} color={def.color} />
      <Page>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <section>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addOrPick();
              }}
              className="relative"
            >
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink/40" aria-hidden="true" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search or add a player"
                aria-label="Search or add a player"
                maxLength={40}
                className="h-14 w-full rounded-2xl border-2 border-ink/10 bg-white pl-12 pr-4 text-lg outline-none focus:border-brand"
              />
            </form>
            <p className="mb-3 mt-4 text-ink/60">Tap players in seat order. The first player tapped goes first.</p>

            <div className="flex flex-wrap gap-2">
              {shown.map((p) => {
                const seat = seats.indexOf(p.id);
                const picked = seat >= 0;
                return (
                  <button
                    key={p.id}
                    onClick={() => toggle(p.id)}
                    aria-pressed={picked}
                    className={`flex h-12 items-center gap-2 rounded-full pl-1.5 pr-4 font-display text-lg font-medium transition active:scale-95 ${
                      picked ? 'text-white shadow-md' : 'border-2 border-ink/10 bg-white text-ink hover:border-ink/25'
                    }`}
                    style={picked ? { background: p.color } : undefined}
                  >
                    {picked ? (
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-white/25">{seat + 1}</span>
                    ) : (
                      <PlayerDot player={p} />
                    )}
                    {p.name}
                  </button>
                );
              })}
              {name && !match && (
                <button
                  onClick={addOrPick}
                  className="flex h-12 items-center gap-2 rounded-full border-2 border-dashed border-brand/50 px-4 font-display text-lg font-medium text-brand hover:bg-brand-pale"
                >
                  <UserPlus className="h-5 w-5" aria-hidden="true" />
                  Add &ldquo;{name}&rdquo;
                </button>
              )}
              {name && match?.hidden && !seats.includes(match.id) && (
                <button
                  onClick={addOrPick}
                  className="flex h-12 items-center gap-2 rounded-full border-2 border-dashed border-brand/50 px-4 font-display text-lg font-medium text-brand hover:bg-brand-pale"
                >
                  <UserPlus className="h-5 w-5" aria-hidden="true" />
                  Bring back {match.name}
                </button>
              )}
              {!name && players.length === 0 && (
                <p className="text-ink/60">No players yet. Type a name above to add the first one.</p>
              )}
            </div>
          </section>

          <aside className="sticky bottom-3 rounded-3xl bg-white p-4 shadow-lg lg:top-28 lg:p-5">
            <h2 className="hidden font-display text-xl font-medium lg:block">Seat order</h2>
            <ol className="hidden lg:mt-3 lg:flex lg:flex-col lg:gap-2">
              {seats.map((id, i) => (
                <li key={id} className="flex items-center gap-3">
                  <span className="w-5 text-right text-ink/50">{i + 1}</span>
                  <PlayerDot player={byId.get(id)} size="sm" />
                  <span className="font-medium">{byId.get(id)?.name}</span>
                </li>
              ))}
              {seats.length === 0 && <li className="text-ink/50">Nobody picked yet</li>}
            </ol>
            {error && <p className="mb-2 text-center font-medium text-danger lg:mt-3">{error}</p>}
            <button
              onClick={start}
              disabled={busy}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl font-display text-xl font-semibold text-white shadow-md active:scale-[0.98] lg:mt-4"
              style={{ background: def.color }}
            >
              <Check className="h-6 w-6" aria-hidden="true" />
              Deal &rsquo;em in{seats.length > 0 && ` · ${seats.length} player${seats.length === 1 ? '' : 's'}`}
            </button>
          </aside>
        </div>
      </Page>
    </>
  );
}
