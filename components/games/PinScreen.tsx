'use client';

import { Club, Diamond, Heart, Spade } from 'lucide-react';
import PinPad from './PinPad';

export default function PinScreen({ onSubmit }: { onSubmit: (pin: string) => Promise<boolean> }) {
  return (
    // dvh is the height actually visible (phone browser toolbars excluded), so this centers without scrolling.
    <main className="flex min-h-dvh flex-col items-center justify-center gap-[clamp(8px,2dvh,28px)] bg-brand px-6 py-[clamp(12px,3dvh,40px)] text-white">
      <div className="flex gap-3 text-brand-light" aria-hidden="true">
        {[Spade, Heart, Club, Diamond].map((Icon, i) => (
          <Icon key={i} className="h-[clamp(20px,3.5dvh,32px)] w-[clamp(20px,3.5dvh,32px)]" />
        ))}
      </div>
      <div className="text-center">
        <h1 className="font-display text-[clamp(28px,5.5dvh,48px)] font-semibold leading-tight">Family Card Games</h1>
        <p className="mt-1 text-lg text-brand-pale">Enter the family PIN</p>
      </div>
      <PinPad onSubmit={onSubmit} />
    </main>
  );
}
