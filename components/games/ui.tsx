'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { ArrowLeft, LoaderCircle } from 'lucide-react';
import type { Player } from '@/lib/games/types';

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

export function Loading() {
  return (
    <div className="grid place-items-center py-20 text-brand">
      <LoaderCircle className="h-10 w-10 animate-spin" aria-label="Loading" />
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
