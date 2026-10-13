'use client';

import { useState } from 'react';
import { ArrowLeft, LoaderCircle } from 'lucide-react';
import { authErrorMessage, type AuthApi } from '@/lib/games/store';
import { ReadyButton } from './ui';

type Mode = 'sign-in' | 'create' | 'reset';

// Optional sign-in with Google or email and password. The family PIN screen stays the default way in.
export default function SignInScreen({ auth, onSignedIn, onBack }: { auth: AuthApi; onSignedIn: () => void; onBack: () => void }) {
  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<'google' | 'email' | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const run = async (kind: 'google' | 'email', action: () => Promise<void>, after?: () => void) => {
    setBusy(kind);
    setError('');
    setNotice('');
    try {
      await action();
      (after ?? onSignedIn)();
    } catch (e) {
      const message = authErrorMessage(e);
      if (message) setError(message);
    }
    setBusy(null);
  };

  const trimmed = email.trim();
  const ready = mode === 'reset' ? trimmed.length > 0 : trimmed.length > 0 && password.length > 0;

  const submit = () => {
    if (!ready) return;
    if (mode === 'reset')
      return run('email', () => auth.resetPassword(trimmed), () => {
        setNotice(`If there's an account for ${trimmed}, a reset link is on its way.`);
        setMode('sign-in');
      });
    run('email', () => (mode === 'create' ? auth.createAccount(trimmed, password) : auth.signInWithEmail(trimmed, password)));
  };

  const switchTo = (next: Mode) => {
    setMode(next);
    setError('');
    setNotice('');
  };

  const title = mode === 'create' ? 'Create an account' : mode === 'reset' ? 'Reset your password' : 'Sign in';

  return (
    <main className="flex min-h-svh items-center justify-center bg-cream px-4 py-6">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-lg">
        <button onClick={onBack} className="-ml-1 mb-3 flex items-center gap-1 text-sm text-ink/60 hover:text-ink">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Use the family PIN
        </button>
        <h1 className="font-display text-3xl font-semibold text-ink">{title}</h1>

        {mode !== 'reset' && (
          <>
            <button
              onClick={() => run('google', () => auth.signInWithGoogle())}
              disabled={busy !== null}
              className="mt-5 flex h-12 w-full items-center justify-center gap-3 rounded-xl border-2 border-ink/15 bg-white font-medium text-ink hover:bg-ink/5 disabled:opacity-60"
            >
              {busy === 'google' ? <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" /> : <GoogleMark />}
              Continue with Google
            </button>
            <div className="my-4 flex items-center gap-3 text-sm text-ink/40">
              <span className="h-px flex-1 bg-ink/10" />
              or
              <span className="h-px flex-1 bg-ink/10" />
            </div>
          </>
        )}
        {mode === 'reset' && <p className="mt-2 text-ink/70">Enter your email and we&apos;ll send a link to set a new password.</p>}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className={`flex flex-col gap-3 ${mode === 'reset' ? 'mt-4' : ''}`}
        >
          <input
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError('');
            }}
            placeholder="you@email.com"
            aria-label="Email"
            className="h-12 rounded-xl border-2 border-ink/10 px-4 text-lg outline-none focus:border-brand"
          />
          {mode !== 'reset' && (
            <input
              type="password"
              autoComplete={mode === 'create' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              placeholder={mode === 'create' ? 'Password (6+ characters)' : 'Password'}
              aria-label="Password"
              className="h-12 rounded-xl border-2 border-ink/10 px-4 text-lg outline-none focus:border-brand"
            />
          )}
          {error && <p className="font-medium text-danger">{error}</p>}
          {notice && <p className="font-medium text-done-text">{notice}</p>}
          <ReadyButton ready={ready} busy={busy === 'email'} onClick={submit}>
            {mode === 'create' ? 'Create account' : mode === 'reset' ? 'Send reset link' : 'Sign in'}
          </ReadyButton>
        </form>

        <p className="mt-4 text-center text-sm text-ink/60">
          {mode === 'sign-in' ? (
            <>
              New here?{' '}
              <button onClick={() => switchTo('create')} className="underline hover:text-ink">
                Create an account
              </button>{' '}
              ·{' '}
              <button onClick={() => switchTo('reset')} className="underline hover:text-ink">
                Forgot password
              </button>
            </>
          ) : (
            <button onClick={() => switchTo('sign-in')} className="underline hover:text-ink">
              Back to sign in
            </button>
          )}
        </p>
        <p className="mt-5 text-center text-xs text-ink/40">Kids can keep using the family PIN.</p>
      </div>
    </main>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
