'use client';

import Link from 'next/link';
import { forwardRef, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, LogOut, X } from 'lucide-react';
import { GROUP_COLORS } from '@/lib/flashcards/types';
import { useFlashcards } from './FlashcardsShell';

export function TopBar({ title, back, right }: { title: React.ReactNode; back?: string; right?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-30 border-b border-ink/[0.06] bg-cream/85 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-2 px-4 sm:px-6">
        {back && (
          <Link
            href={back}
            aria-label="Back"
            className="-ml-2 grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink/70 hover:bg-ink/5 hover:text-ink"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
        )}
        <div className="min-w-0 flex-1">{title}</div>
        {right}
      </div>
    </header>
  );
}

export function PageBody({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto max-w-5xl px-4 pb-28 pt-5 sm:px-6 sm:pt-8">{children}</main>;
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-fc text-white shadow-sm hover:bg-fc-dark disabled:bg-ink/10 disabled:text-ink/40 disabled:shadow-none',
  secondary: 'border border-ink/15 bg-white text-ink hover:border-ink/25 hover:bg-ink/[0.03] disabled:text-ink/35',
  ghost: 'text-ink/70 hover:bg-ink/5 hover:text-ink disabled:text-ink/30',
  danger: 'bg-danger text-white hover:bg-[#8A2424]',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'md' | 'lg' }) {
  const sizing = size === 'lg' ? 'h-14 px-6 text-lg' : 'h-11 px-4';
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-medium transition active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100 ${sizing} ${VARIANTS[variant]} ${className}`}
    />
  );
}

// A dialog: a sheet from the bottom on phones, a centered card on larger screens.
export function Sheet({
  title,
  onClose,
  children,
  footer,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex animate-fade-in items-end justify-center bg-ink/40 backdrop-blur-[2px] sm:items-center sm:p-6"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`flex max-h-[92svh] w-full animate-sheet-in flex-col rounded-t-3xl bg-white shadow-2xl sm:max-h-[88svh] sm:rounded-3xl ${wide ? 'sm:max-w-2xl' : 'sm:max-w-md'}`}
      >
        <div className="flex items-center gap-2 px-5 pb-2 pt-4 sm:px-6 sm:pt-5">
          <h2 className="flex-1 font-display text-xl font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="-mr-2 grid h-10 w-10 place-items-center rounded-full text-ink/60 hover:bg-ink/5">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 sm:px-6">{children}</div>
        {footer && (
          <div className="flex flex-wrap items-center gap-2 border-t border-ink/[0.06] px-5 pb-[max(16px,env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:pb-5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function ColorPicker({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  return (
    <div role="radiogroup" aria-label="Color" className="flex flex-wrap gap-2.5">
      {GROUP_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          role="radio"
          aria-checked={value === color}
          aria-label={color}
          onClick={() => onChange(color)}
          className={`grid h-10 w-10 place-items-center rounded-full ring-offset-2 transition ${value === color ? 'ring-2 ring-ink/70' : 'hover:scale-110'}`}
          style={{ background: color }}
        >
          {value === color && <Check className="h-5 w-5 text-white" aria-hidden="true" />}
        </button>
      ))}
    </div>
  );
}

// The signed-in account's photo or initial, with a menu to sign out.
export function AccountMenu() {
  const { user, signOut } = useFlashcards();
  const [open, setOpen] = useState(false);
  const [broken, setBroken] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const label = user.displayName || user.email || 'Account';
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Account"
        aria-expanded={open}
        className="grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-fc-pale font-semibold text-fc-deep ring-1 ring-ink/10 hover:ring-ink/25"
      >
        {user.photoUrl && !broken ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.photoUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" onError={() => setBroken(true)} />
        ) : (
          label.charAt(0).toUpperCase()
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-40 w-64 animate-fade-in rounded-2xl border border-ink/10 bg-white p-2 shadow-xl">
          <div className="px-3 py-2">
            {user.displayName && <p className="truncate font-medium">{user.displayName}</p>}
            {user.email && <p className="truncate text-sm text-ink/55">{user.email}</p>}
          </div>
          <button
            onClick={signOut}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-ink/80 hover:bg-ink/5"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export function cardCount(n: number): string {
  return `${n} ${n === 1 ? 'card' : 'cards'}`;
}

// Textarea that grows with its text.
export const AutoTextarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { minRows?: number }
>(function AutoTextarea({ minRows = 3, className = '', ...props }, forwarded) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [props.value]);
  return (
    <textarea
      ref={(el) => {
        ref.current = el;
        if (typeof forwarded === 'function') forwarded(el);
        else if (forwarded) forwarded.current = el;
      }}
      rows={minRows}
      {...props}
      className={`w-full resize-none rounded-xl border border-ink/15 bg-white px-4 py-3 text-base leading-relaxed outline-none transition placeholder:text-ink/35 focus:border-fc focus:ring-4 focus:ring-fc/15 ${className}`}
    />
  );
});
