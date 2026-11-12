'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Layers, LoaderCircle } from 'lucide-react';
import SignInScreen from '@/components/games/SignInScreen';
import { BACKEND_CONFIGURED, getBackend, type AuthApi, type AuthUser } from '@/lib/games/store';
import { getFlashcardStore, type FlashcardStore } from '@/lib/flashcards/store';
import type { Group } from '@/lib/flashcards/types';

interface FlashcardsContextValue {
  user: AuthUser;
  store: FlashcardStore;
  // All of this account's groups, newest first, or null until the first load.
  groups: Group[] | null;
  signOut: () => void;
  // Runs a save and shows a message if it fails, so pages don't each handle errors.
  save: (action: () => Promise<unknown>) => Promise<boolean>;
  toast: (message: string) => void;
}

const FlashcardsContext = createContext<FlashcardsContextValue | null>(null);

export function useFlashcards(): FlashcardsContextValue {
  const ctx = useContext(FlashcardsContext);
  if (!ctx) throw new Error('useFlashcards must be used inside FlashcardsShell');
  return ctx;
}

type State =
  | { status: 'checking' }
  | { status: 'signed-out'; auth: AuthApi }
  | { status: 'ready'; auth: AuthApi; user: AuthUser; store: FlashcardStore }
  | { status: 'error'; message: string };

// Flashcards need an account (the same Google or email sign-in as the games), and each account sees only
// its own groups.
export default function FlashcardsShell({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>({ status: 'checking' });

  useEffect(() => {
    if (!BACKEND_CONFIGURED) {
      setState({ status: 'error', message: "The flashcards database isn't set up yet." });
      return;
    }
    let off: (() => void) | undefined;
    let cancelled = false;
    getBackend()
      .then((backend) => {
        if (cancelled) return;
        off = backend.auth.onChange(async (user) => {
          if (!user) return setState({ status: 'signed-out', auth: backend.auth });
          const store = await getFlashcardStore(user.uid);
          setState({ status: 'ready', auth: backend.auth, user, store });
        });
      })
      .catch(() => setState({ status: 'error', message: "Couldn't load flashcards. Check your connection." }));
    return () => {
      cancelled = true;
      off?.();
    };
  }, []);

  if (state.status === 'checking') {
    return (
      <div className="grid min-h-svh place-items-center text-fc">
        <LoaderCircle className="h-10 w-10 animate-spin" aria-label="Loading" />
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="grid min-h-svh place-items-center p-6 text-center">
        <div>
          <p className="font-display text-2xl font-medium">{state.message}</p>
          <button onClick={() => location.reload()} className="mt-6 rounded-xl bg-fc px-6 py-3 font-medium text-white">
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (state.status === 'signed-out') {
    return (
      <SignInScreen
        auth={state.auth}
        // The auth listener above moves on to the app once the account is signed in.
        onSignedIn={() => {}}
        footnote="Your flashcards are private to your account and sync across your devices."
        heading={
          <div className="mb-5 flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-fc text-white shadow-md">
              <Layers className="h-6 w-6" aria-hidden="true" />
            </span>
            <span className="font-display text-xl font-semibold text-fc-deep">Flashcards</span>
          </div>
        }
      />
    );
  }

  return (
    <Ready key={state.user.uid} user={state.user} store={state.store} signOut={() => state.auth.signOut()}>
      {children}
    </Ready>
  );
}

function Ready({
  user,
  store,
  signOut,
  children,
}: {
  user: AuthUser;
  store: FlashcardStore;
  signOut: () => void;
  children: React.ReactNode;
}) {
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const toast = useCallback((text: string) => {
    setMessage(text);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(null), 3500);
  }, []);

  useEffect(
    () =>
      store.subscribeGroups(
        (list) => setGroups([...list].sort((a, b) => b.createdAt - a.createdAt)),
        () => toast("Couldn't load your flashcards. Check your connection."),
      ),
    [store, toast],
  );

  const save = useCallback(
    async (action: () => Promise<unknown>) => {
      try {
        await action();
        return true;
      } catch (e) {
        toast(e instanceof Error && e.message.startsWith('This group') ? e.message : "Couldn't save. Check your connection and try again.");
        return false;
      }
    },
    [toast],
  );

  return (
    <FlashcardsContext.Provider value={{ user, store, groups, signOut, save, toast }}>
      {children}
      {message && (
        <div
          role="status"
          className="fixed inset-x-0 bottom-[max(16px,env(safe-area-inset-bottom))] z-[60] mx-auto w-fit max-w-[calc(100%-32px)] animate-sheet-in rounded-2xl bg-ink px-5 py-3 text-center text-sm font-medium text-cream shadow-xl"
        >
          {message}
        </div>
      )}
    </FlashcardsContext.Provider>
  );
}
