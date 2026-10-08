'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { derivePinKey } from '@/lib/games/pin';
import { BACKEND_CONFIGURED, getBackend, type FamilyStore } from '@/lib/games/store';
import PinScreen from './PinScreen';

const SESSION_KEY = 'games.session';

interface GamesContextValue {
  store: FamilyStore;
  localMode: boolean;
  lock: () => void;
}

const GamesContext = createContext<GamesContextValue | null>(null);

export function useGames(): GamesContextValue {
  const ctx = useContext(GamesContext);
  if (!ctx) throw new Error('useGames must be used inside GamesShell');
  return ctx;
}

type State =
  | { status: 'checking' }
  | { status: 'locked' }
  | { status: 'unlocked'; store: FamilyStore; localMode: boolean }
  | { status: 'error'; message: string };

function readSession(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

function writeSession(pinKey: string | null) {
  try {
    if (pinKey) localStorage.setItem(SESSION_KEY, pinKey);
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    // Private browsing: the PIN is just asked for again next visit.
  }
}

export default function GamesShell({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>({ status: 'checking' });

  // Each visit re-checks the remembered PIN, so changing the PIN locks every device.
  const tryKey = useCallback(async (pinKey: string) => {
    const backend = await getBackend();
    const familyId = await backend.lookupPin(pinKey);
    if (!familyId) return false;
    writeSession(pinKey);
    setState({ status: 'unlocked', store: backend.family(familyId), localMode: backend.mode === 'local' });
    return true;
  }, []);

  const check = useCallback(() => {
    if (!BACKEND_CONFIGURED) {
      setState({ status: 'error', message: "The scoreboard database isn't set up yet." });
      return;
    }
    const saved = readSession();
    if (!saved) {
      setState({ status: 'locked' });
      return;
    }
    setState({ status: 'checking' });
    tryKey(saved)
      .then((ok) => {
        if (!ok) {
          writeSession(null);
          setState({ status: 'locked' });
        }
      })
      .catch(() => setState({ status: 'error', message: "Couldn't reach the scoreboard. Check your connection." }));
  }, [tryKey]);

  useEffect(check, [check]);

  const unlock = useCallback(async (pin: string) => tryKey(await derivePinKey(pin)), [tryKey]);

  const lock = useCallback(() => {
    writeSession(null);
    setState({ status: 'locked' });
  }, []);

  if (state.status === 'checking') {
    return (
      <div className="grid min-h-screen place-items-center text-brand">
        <LoaderCircle className="h-10 w-10 animate-spin" aria-label="Loading" />
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="grid min-h-screen place-items-center p-6 text-center">
        <div>
          <p className="font-display text-2xl font-medium text-ink">{state.message}</p>
          <button onClick={check} className="mt-6 rounded-xl bg-brand px-6 py-3 font-display text-lg text-white">
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (state.status === 'locked') return <PinScreen onSubmit={unlock} />;

  return (
    <GamesContext.Provider value={{ store: state.store, localMode: state.localMode, lock }}>
      {state.localMode && (
        <div className="bg-playing-bg px-4 py-1.5 text-center text-sm text-playing-text">
          Local test mode: data is saved only in this browser.
        </div>
      )}
      {children}
    </GamesContext.Provider>
  );
}
