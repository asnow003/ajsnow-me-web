'use client';

import { Club, Diamond, Heart, Spade } from 'lucide-react';
import PinPad from './PinPad';

export default function PinScreen({ onSubmit }: { onSubmit: (pin: string) => Promise<boolean> }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-brand px-6 py-10 text-white sm:gap-8">
      <div className="flex gap-3 text-brand-light" aria-hidden="true">
        {[Spade, Heart, Club, Diamond].map((Icon, i) => (
          <Icon key={i} className="h-7 w-7 sm:h-8 sm:w-8" />
        ))}
      </div>
      <h1 className="text-center font-display text-4xl font-semibold leading-tight sm:text-5xl">Family Card Games</h1>
      <p className="text-lg text-brand-pale">Enter the family PIN</p>
      <PinPad onSubmit={onSubmit} />
    </main>
  );
}
