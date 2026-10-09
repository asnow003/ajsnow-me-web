'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { LoaderCircle, LockOpen, ShieldCheck } from 'lucide-react';
import { deriveAdminPinKey, derivePinKey } from '@/lib/games/pin';
import { BACKEND_CONFIGURED, getBackend, type Backend, type FamilyStore } from '@/lib/games/store';
import PinPad from './PinPad';
import PinScreen from './PinScreen';

const SESSION_KEY = 'games.session';
const ADMIN_KEY = 'games.admin';
const ADMIN_MINUTES = 10;

interface GamesContextValue {
  store: FamilyStore;
  localMode: boolean;
  lock: () => void;
  isAdmin: boolean;
  // Runs the action now in admin mode, otherwise asks for the admin PIN first.
  requireAdmin: (action: () => void) => void;
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
  | { status: 'unlocked'; backend: Backend; familyId: string }
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
    setState({ status: 'unlocked', backend, familyId });
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
      <div className="grid min-h-svh place-items-center text-brand">
        <LoaderCircle className="h-10 w-10 animate-spin" aria-label="Loading" />
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="grid min-h-svh place-items-center p-6 text-center">
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
    <Unlocked backend={state.backend} familyId={state.familyId} lock={lock}>
      {children}
    </Unlocked>
  );
}

function readAdminUntil(familyId: string): number | null {
  try {
    const saved = JSON.parse(localStorage.getItem(ADMIN_KEY) ?? 'null') as { familyId: string; until: number } | null;
    return saved && saved.familyId === familyId && saved.until > Date.now() ? saved.until : null;
  } catch {
    return null;
  }
}

function writeAdminUntil(familyId: string, until: number | null) {
  try {
    if (until) localStorage.setItem(ADMIN_KEY, JSON.stringify({ familyId, until }));
    else localStorage.removeItem(ADMIN_KEY);
  } catch {
    // Private browsing: admin mode just doesn't survive a reload.
  }
}

// Admin mode lasts ADMIN_MINUTES on this device after the admin PIN is entered.
function Unlocked({
  backend,
  familyId,
  lock,
  children,
}: {
  backend: Backend;
  familyId: string;
  lock: () => void;
  children: React.ReactNode;
}) {
  const [store] = useState(() => backend.family(familyId));
  const [adminUntil, setAdminUntil] = useState(() => readAdminUntil(familyId));
  const [now, setNow] = useState(() => Date.now());
  const [asking, setAsking] = useState(false);
  const pending = useRef<(() => void) | null>(null);
  const isAdmin = adminUntil !== null && now < adminUntil;

  useEffect(() => {
    if (adminUntil === null) return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [adminUntil]);

  useEffect(() => {
    if (adminUntil !== null && now >= adminUntil) {
      writeAdminUntil(familyId, null);
      setAdminUntil(null);
    }
  }, [adminUntil, now, familyId]);

  const requireAdmin = useCallback(
    (action: () => void) => {
      if (isAdmin) return action();
      pending.current = action;
      setAsking(true);
    },
    [isAdmin],
  );

  const submitAdminPin = useCallback(
    async (pin: string) => {
      if ((await backend.lookupAdminPin(await deriveAdminPinKey(pin))) !== familyId) return false;
      const until = Date.now() + ADMIN_MINUTES * 60_000;
      writeAdminUntil(familyId, until);
      setAdminUntil(until);
      setNow(Date.now());
      setAsking(false);
      const action = pending.current;
      pending.current = null;
      action?.();
      return true;
    },
    [backend, familyId],
  );

  const cancelAdmin = useCallback(() => {
    pending.current = null;
    setAsking(false);
  }, []);

  const lockAdmin = () => {
    writeAdminUntil(familyId, null);
    setAdminUntil(null);
  };

  const left = isAdmin ? Math.ceil((adminUntil - now) / 1000) : 0;

  return (
    <GamesContext.Provider value={{ store, localMode: backend.mode === 'local', lock, isAdmin, requireAdmin }}>
      {backend.mode === 'local' && (
        <div className="bg-playing-bg px-4 py-1.5 text-center text-sm text-playing-text">
          Local test mode: data is saved only in this browser.
        </div>
      )}
      {isAdmin && (
        <div className="flex items-center justify-center gap-2 bg-done px-4 py-1.5 text-sm text-white">
          <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            Admin mode · locks in{' '}
            <span className="tabular-nums">
              {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}
            </span>
          </span>
          <button onClick={lockAdmin} className="ml-2 rounded-full bg-white/20 px-3 py-0.5 font-medium hover:bg-white/30">
            Lock now
          </button>
        </div>
      )}
      {children}
      {asking && <AdminPinDialog onSubmit={submitAdminPin} onCancel={cancelAdmin} />}
    </GamesContext.Provider>
  );
}

function AdminPinDialog({ onSubmit, onCancel }: { onSubmit: (pin: string) => Promise<boolean>; onCancel: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-ink/50 p-3 sm:place-items-center" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Admin PIN"
        className="max-h-[calc(100svh-24px)] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-[clamp(16px,3svh,24px)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center gap-2">
          <LockOpen className="h-6 w-6 text-brand" aria-hidden="true" />
          <h2 className="font-display text-2xl font-semibold text-ink">Admin PIN</h2>
        </div>
        <p className="mb-[clamp(8px,2svh,20px)] text-ink/70">
          Deleting games, reopening them, editing past rounds and managing players need the admin PIN. It stays unlocked
          on this device for {ADMIN_MINUTES} minutes.
        </p>
        <PinPad onSubmit={onSubmit} variant="light" />
        <button
          onClick={onCancel}
          className="mt-2 h-12 w-full rounded-xl border-2 border-ink/15 font-display text-lg font-medium text-ink hover:bg-ink/5"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
