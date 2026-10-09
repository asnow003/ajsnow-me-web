'use client';

import { useCallback, useEffect, useState } from 'react';
import { Club, Delete, Diamond, Heart, LoaderCircle, Spade } from 'lucide-react';

const SUITS = [
  { icon: Spade, color: 'text-brand-deep' },
  { icon: Heart, color: 'text-danger' },
  { icon: Club, color: 'text-brand-deep' },
  { icon: Diamond, color: 'text-danger' },
];

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'];

// Four suit boxes and a keypad. Submits on the fourth digit; the physical keyboard works too.
export default function PinPad({
  onSubmit,
  variant = 'dark',
}: {
  onSubmit: (pin: string) => Promise<boolean>;
  variant?: 'dark' | 'light';
}) {
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(0);
  const dark = variant === 'dark';

  const press = useCallback(
    (key: string) => {
      if (busy) return;
      setError('');
      if (key === 'back') setPin((p) => p.slice(0, -1));
      else setPin((p) => (p.length < 4 ? p + key : p));
    },
    [busy],
  );

  useEffect(() => {
    if (pin.length !== 4) return;
    setBusy(true);
    onSubmit(pin)
      .then((ok) => {
        if (!ok) {
          setError("That PIN didn't work. Try again.");
          setShake((n) => n + 1);
          setPin('');
        }
      })
      .catch(() => {
        setError("Couldn't reach the scoreboard. Check your connection.");
        setPin('');
      })
      .finally(() => setBusy(false));
  }, [pin, onSubmit]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') press('back');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [press]);

  return (
    <div className="flex flex-col items-center gap-5">
      <div key={shake} className={`flex gap-3 ${shake ? 'animate-shake' : ''}`} aria-live="polite">
        {SUITS.map(({ icon: Icon, color }, i) => (
          <div
            key={i}
            className={`grid h-16 w-12 place-items-center rounded-xl sm:h-20 sm:w-14 ${
              i < pin.length ? (dark ? 'bg-white' : 'bg-white ring-2 ring-brand') : dark ? 'bg-brand-light/40' : 'bg-brand-pale'
            }`}
          >
            {i < pin.length && <Icon className={`h-7 w-7 fill-current ${color}`} aria-label="Digit entered" />}
          </div>
        ))}
      </div>

      <p className={`h-6 text-center font-medium ${dark ? 'text-playing' : 'text-danger'}`}>{busy ? '' : error}</p>

      <div className="grid grid-cols-3 gap-3">
        {KEYS.map((key, i) =>
          key === '' ? (
            <div key={i} />
          ) : (
            <button
              key={i}
              onClick={() => press(key)}
              aria-label={key === 'back' ? 'Delete digit' : key}
              className={`grid h-16 w-16 place-items-center rounded-2xl font-display text-2xl font-medium transition active:scale-95 sm:h-[72px] sm:w-[72px] ${
                dark ? 'bg-brand-dark text-white hover:bg-brand-deep' : 'bg-brand-pale text-brand-deep hover:bg-brand-light/60'
              }`}
            >
              {key === 'back' ? <Delete className="h-6 w-6" /> : key}
            </button>
          ),
        )}
      </div>
      <div className={`h-6 ${dark ? 'text-white' : 'text-brand'}`}>
        {busy && <LoaderCircle className="h-6 w-6 animate-spin" aria-label="Checking" />}
      </div>
    </div>
  );
}
