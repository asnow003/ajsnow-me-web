'use client';

import { CircleUserRound, Club, Diamond, Heart, Spade } from 'lucide-react';
import PinPad from './PinPad';

export default function PinScreen({ onSubmit, onSignIn }: { onSubmit: (pin: string) => Promise<boolean>; onSignIn?: () => void }) {
  return (
    // svh is the visible height with phone browser toolbars showing, the smallest it gets, so the pad always fits
    // and nothing resizes as the toolbars slide away.
    <main className="flex min-h-svh flex-col items-center justify-center gap-[clamp(8px,2svh,28px)] bg-brand px-6 py-[clamp(12px,3svh,40px)] text-white">
      <div className="flex gap-3 text-brand-light" aria-hidden="true">
        {[Spade, Heart, Club, Diamond].map((Icon, i) => (
          <Icon key={i} className="h-[clamp(20px,3.5svh,32px)] w-[clamp(20px,3.5svh,32px)]" />
        ))}
      </div>
      <div className="text-center">
        <h1 className="font-display text-[clamp(28px,5.5svh,48px)] font-semibold leading-tight">Family Card Games</h1>
        <p className="mt-1 text-lg text-brand-pale">Enter the family PIN</p>
      </div>
      <PinPad onSubmit={onSubmit} />
      {onSignIn && (
        <button
          onClick={onSignIn}
          className="flex items-center gap-2 rounded-full bg-white px-5 py-2 font-display text-lg font-medium text-brand-dark shadow hover:bg-brand-pale"
        >
          <CircleUserRound className="h-5 w-5" aria-hidden="true" />
          Sign in instead
        </button>
      )}
    </main>
  );
}
