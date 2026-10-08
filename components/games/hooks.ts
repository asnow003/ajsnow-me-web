'use client';

import { useEffect, useState } from 'react';
import type { Game, Player } from '@/lib/games/types';
import { useGames } from './GamesShell';

// Each hook returns undefined while loading. Errors are thrown to the nearest error boundary.
function useSubscription<T>(
  subscribe: (cb: (v: T) => void, onError: (e: Error) => void) => () => void,
  deps: unknown[],
): T | undefined {
  const [value, setValue] = useState<T>();
  const [error, setError] = useState<Error>();
  useEffect(() => {
    setValue(undefined);
    return subscribe(setValue, setError);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  if (error) throw error;
  return value;
}

export function usePlayers(): Player[] | undefined {
  const { store } = useGames();
  const players = useSubscription<Player[]>((cb, err) => store.subscribePlayers(cb, err), [store]);
  return players && [...players].sort((a, b) => a.name.localeCompare(b.name));
}

export function useAllGames(): Game[] | undefined {
  const { store } = useGames();
  const games = useSubscription<Game[]>((cb, err) => store.subscribeGames(cb, err), [store]);
  return games && [...games].sort((a, b) => b.createdAt - a.createdAt);
}

export function useGame(id: string): Game | null | undefined {
  const { store } = useGames();
  return useSubscription<Game | null>((cb, err) => store.subscribeGame(id, cb, err), [store, id]);
}

export function usePlayerMap(): Map<string, Player> | undefined {
  const players = usePlayers();
  return players && new Map(players.map((p) => [p.id, p]));
}
