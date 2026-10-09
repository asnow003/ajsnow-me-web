'use client';

import Link from 'next/link';
import { useContext, useEffect, useState } from 'react';
import { ArrowLeft, Check, LoaderCircle } from 'lucide-react';
import type { Player } from '@/lib/games/types';
import { GamesContext } from './GamesShell';

export function Header({
  title,
  back,
  color = '#534AB7',
  right,
}: {
  title: string;
  back?: string;
  color?: string;
  right?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-20 bg-cream/90 px-3 pt-3 backdrop-blur sm:px-6 sm:pt-5">
      <div
        className="mx-auto flex max-w-5xl items-center gap-2 rounded-2xl px-3 py-3 text-white shadow-md sm:px-5 sm:py-4"
        style={{ background: color }}
      >
        {back && (
          <Link href={back} aria-label="Back" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl hover:bg-white/15">
            <ArrowLeft className="h-6 w-6" />
          </Link>
        )}
        <h1 className="min-w-0 flex-1 truncate font-display text-2xl font-semibold sm:text-3xl">{title}</h1>
        {right}
      </div>
    </header>
  );
}

export function Page({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto max-w-5xl px-3 pb-16 pt-4 sm:px-6 sm:pt-6">{children}</main>;
}

// A spinner that recovers: after a few seconds it resets the database connection (a connection that died
// while the phone slept can leave a page waiting forever), and if that doesn't help it offers a reload.
export function Loading() {
  const reconnect = useContext(GamesContext)?.reconnect;
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const nudge = setTimeout(() => reconnect?.(), 6_000);
    const giveUp = setTimeout(() => setSlow(true), 12_000);
    return () => {
      clearTimeout(nudge);
      clearTimeout(giveUp);
    };
  }, [reconnect]);

  return (
    <div className="grid place-items-center gap-4 py-20 text-center text-brand">
      <LoaderCircle className="h-10 w-10 animate-spin" aria-label="Loading" />
      {slow && (
        <div>
          <p className="text-ink/70">This is taking longer than usual.</p>
          <button
            onClick={() => location.reload()}
            className="mt-3 rounded-xl bg-brand px-5 py-2.5 font-display text-lg font-medium text-white hover:bg-brand-dark"
          >
            Reload
          </button>
        </div>
      )}
    </div>
  );
}

export function PlayerDot({ player, size = 'md' }: { player?: Player; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'h-7 w-7 text-sm', md: 'h-9 w-9 text-base', lg: 'h-11 w-11 text-lg' };
  return (
    <span
      className={`inline-grid shrink-0 place-items-center rounded-full font-display font-semibold text-white ring-2 ring-white ${sizes[size]}`}
      style={{ background: player?.color ?? '#888780' }}
      aria-hidden="true"
    >
      {player?.name.charAt(0).toUpperCase() ?? '?'}
    </span>
  );
}

export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  danger,
  onConfirm,
  onCancel,
  children,
}: {
  title: string;
  body?: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: React.ReactNode;
}) {
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
        aria-label={title}
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-2xl font-semibold text-ink">{title}</h2>
        {body && <p className="mt-2 text-ink/70">{body}</p>}
        {children}
        <div className="mt-6 flex gap-3">
          <button onClick={onCancel} className="h-12 flex-1 rounded-xl border-2 border-ink/15 font-display text-lg font-medium text-ink hover:bg-ink/5">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`h-12 flex-1 rounded-xl font-display text-lg font-medium text-white ${danger ? 'bg-danger' : 'bg-brand'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function formatDate(ms: number): string {
  const d = new Date(ms);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Today';
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(d.getFullYear() !== today.getFullYear() && { year: 'numeric' }),
  });
}

// When a game took place, e.g. "Today, 7:15 PM" or "Oct 5, 7:15 PM".
export function formatDateTime(ms: number): string {
  const time = new Date(ms).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${formatDate(ms)}, ${time}`;
}

// The main action on a step (save, lock in, start). Grey until everything it needs is filled in, then go-green.
export function ReadyButton({
  ready,
  busy = false,
  onClick,
  children,
}: {
  ready: boolean;
  busy?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={!ready || busy}
      className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-go font-display text-xl font-semibold text-white shadow-md transition hover:bg-go-dark active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-ink/10 disabled:text-ink/40 disabled:shadow-none disabled:active:scale-100"
    >
      {busy ? <LoaderCircle className="h-6 w-6 animate-spin" aria-hidden="true" /> : <Check className="h-6 w-6" aria-hidden="true" />}
      {children}
    </button>
  );
}
