'use client';

import { useEffect, useRef, useState } from 'react';
import { Minus, PartyPopper, Plus } from 'lucide-react';
import { RulesSection } from '@/components/games/RulesCard';
import { PlayerDot, ReadyButton } from '@/components/games/ui';
import { totals } from '@/lib/games/scoring';
import type { Game } from '@/lib/games/types';
import type { GameScorer, ScorerPanelProps } from '../scorers';

const DEFAULT_HOLES = 9;
const MAX_HOLES = 36;

function holesFor(game: Game): number {
  return game.settings?.holes ?? DEFAULT_HOLES;
}

export const golfScorer: GameScorer = {
  Panel: GolfPanel,
  roundNoun: 'Hole',
  Setup: HolesSetup,
  Rules: GolfRules,
  defaultSettings: { holes: DEFAULT_HOLES },

  progress(game) {
    const total = holesFor(game);
    return { current: Math.min(game.rounds.length + 1, total), total, done: game.rounds.length >= total };
  },
  roundLabel: (_round, index) => index + 1,
  cell: (round, pid) => ({ score: round.scores[pid] ?? 0, detail: null }),
  canEdit: () => true,
};

function GolfPanel({ game, def, players, editRound, onDoneEditing, saveRounds, onAllRoundsDone }: ScorerPanelProps) {
  const holes = holesFor(game);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editRound !== null) ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [editRound]);

  const editing = editRound !== null && game.rounds[editRound] ? editRound : null;
  const index = editing ?? game.rounds.length;

  return (
    <div ref={ref} className="scroll-mt-28 rounded-3xl bg-white p-4 shadow-md sm:p-5">
      {editing === null && game.rounds.length >= holes ? (
        <div className="py-2 text-center">
          <PartyPopper className="mx-auto h-8 w-8" style={{ color: def.color }} aria-hidden="true" />
          <p className="mt-2 font-display text-xl font-semibold">All {holes} holes played</p>
          <p className="mt-1 text-sm text-ink/60">Finish the game to record the winner.</p>
        </div>
      ) : (
        <HoleEditor
          key={`${editing === null ? 'new' : 'edit'}-${index}`}
          game={game}
          color={def.color}
          players={players}
          index={index}
          holes={holes}
          initial={editing === null ? undefined : game.rounds[editing].scores}
          onCancel={editing === null ? undefined : onDoneEditing}
          onSave={async (scores) => {
            const rounds =
              editing === null ? [...game.rounds, { scores }] : game.rounds.map((r, i) => (i === editing ? { scores } : r));
            await saveRounds(rounds);
            if (editing !== null) onDoneEditing();
            else if (rounds.length >= holes) onAllRoundsDone();
          }}
        />
      )}
    </div>
  );
}

function HoleEditor({
  game,
  color,
  players,
  index,
  holes,
  initial,
  onSave,
  onCancel,
}: {
  game: Game;
  color: string;
  players: ScorerPanelProps['players'];
  index: number;
  holes: number;
  initial?: Record<string, number>;
  onSave: (scores: Record<string, number>) => Promise<void>;
  onCancel?: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(game.playerIds.map((p) => [p, initial?.[p] !== undefined ? String(initial[p]) : ''])),
  );
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const t = totals(game);
  const dealer = players.get(game.playerIds[index % game.playerIds.length])?.name;

  const set = (pid: string, v: string) => {
    setValues((s) => ({ ...s, [pid]: v.replace(/[^\d-]/g, '').replace(/(?!^)-/g, '').slice(0, 4) }));
    setError('');
  };

  // Phone number pads have no minus key, so a button flips the sign.
  const flip = (pid: string) => {
    const v = values[pid];
    set(pid, v.startsWith('-') ? v.slice(1) : `-${v}`);
  };

  const parsed = Object.fromEntries(game.playerIds.map((p) => [p, Number.parseInt(values[p], 10)]));
  const missing = game.playerIds.filter((p) => Number.isNaN(parsed[p]));
  // The save button stays off until everyone has a score.
  const waiting = missing.length
    ? `Waiting on ${missing.length === game.playerIds.length ? 'everyone' : missing.map((p) => players.get(p)?.name).join(', ')}`
    : null;

  const save = async () => {
    if (waiting) return;
    setBusy(true);
    try {
      await onSave(parsed);
    } catch {
      setError("Couldn't save. Check your connection and try again.");
    }
    setBusy(false);
  };

  return (
    <>
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-display text-2xl font-semibold">
          Hole {index + 1} <span className="text-base font-normal text-ink/50">of {holes}</span>
        </h2>
      </div>
      <p className="mt-1 text-sm text-ink/60">
        {onCancel ? 'Correct this hole and the totals update.' : `${dealer} deals. Enter each player's score for the hole.`}
      </p>

      <ul className="mt-4 flex flex-col gap-2">
        {game.playerIds.map((pid, i) => {
          const player = players.get(pid);
          const v = values[pid];
          return (
            <li key={pid} className="flex items-center gap-2 rounded-2xl border-2 border-ink/10 p-2 pl-2.5">
              <PlayerDot player={player} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-display text-lg font-medium">{player?.name}</div>
                {!onCancel && <div className="text-xs text-ink/50">Total {t[pid]}</div>}
              </div>
              <button
                type="button"
                onClick={() => flip(pid)}
                aria-label={`Make ${player?.name}'s score ${v.startsWith('-') ? 'positive' : 'negative'}`}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-cream text-ink hover:bg-ink/10"
              >
                {v.startsWith('-') ? <Plus className="h-5 w-5" /> : <Minus className="h-5 w-5" />}
              </button>
              <input
                value={v}
                onChange={(e) => set(pid, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  const next = document.getElementById(`golf-${game.playerIds[i + 1]}`);
                  if (next) next.focus();
                  else save();
                }}
                id={`golf-${pid}`}
                inputMode="numeric"
                enterKeyHint={i === game.playerIds.length - 1 ? 'done' : 'next'}
                aria-label={`${player?.name}'s score`}
                placeholder="–"
                className="h-12 w-20 shrink-0 rounded-xl border-2 border-ink/10 bg-white text-center font-display text-2xl font-semibold outline-none focus:border-[var(--game)]"
                style={{ '--game': color } as React.CSSProperties}
              />
            </li>
          );
        })}
      </ul>

      {waiting && <p className="mt-3 text-center text-sm font-medium text-ink/70">{waiting}</p>}
      {error && <p className="mt-3 text-center font-medium text-danger">{error}</p>}
      <div className="mt-3">
        <ReadyButton ready={waiting === null} busy={busy} onClick={save}>
          {onCancel ? 'Save changes' : `Save hole ${index + 1}`}
        </ReadyButton>
      </div>
      {onCancel && (
        <button onClick={onCancel} className="mx-auto mt-3 block text-sm text-ink/60 underline hover:text-ink">
          Cancel
        </button>
      )}
    </>
  );
}

function HolesSetup({
  settings,
  onChange,
  color,
}: {
  settings: Record<string, number>;
  onChange: (s: Record<string, number>) => void;
  color: string;
}) {
  const holes = settings.holes ?? DEFAULT_HOLES;
  const setHoles = (n: number) => onChange({ ...settings, holes: Math.min(MAX_HOLES, Math.max(1, n)) });
  const step = 'grid h-11 w-11 place-items-center rounded-xl bg-cream text-ink hover:bg-ink/10 disabled:opacity-40';

  return (
    <div className="flex items-center gap-3">
      <span className="flex-1 font-display text-lg font-medium">Holes</span>
      <button type="button" className={step} onClick={() => setHoles(holes - 1)} disabled={holes <= 1} aria-label="Fewer holes">
        <Minus className="h-5 w-5" />
      </button>
      <span className="w-10 text-center font-display text-2xl font-semibold tabular-nums" style={{ color }} aria-live="polite">
        {holes}
      </span>
      <button type="button" className={step} onClick={() => setHoles(holes + 1)} disabled={holes >= MAX_HOLES} aria-label="More holes">
        <Plus className="h-5 w-5" />
      </button>
    </div>
  );
}

function GolfRules() {
  return (
    <>
      <p>Lowest total score after all the holes wins. A game is usually 9 holes.</p>
      <RulesSection title="The deal">
        <p>
          Deal 6 cards face down to each player. Each player lays them out in two rows of three and turns any two face
          up, without looking at the others. Put the rest face down as the stock and turn the top card over to start the
          discard pile.
        </p>
      </RulesSection>
      <RulesSection title="Playing a hole">
        <p>
          Starting left of the dealer, each turn you draw one card from the stock or the discard pile. Either swap it
          for one of your six cards (the new card stays face up and the old one is discarded) or discard it. The hole
          ends once someone has all six cards face up. Then everyone adds up their cards.
        </p>
      </RulesSection>
      <RulesSection title="Card values">
        <ul className="grid grid-cols-2 gap-x-4 gap-y-0.5 sm:grid-cols-3">
          <li>Ace: 1</li>
          <li>2: −2</li>
          <li>3–10: face value</li>
          <li>Jack, Queen: 10</li>
          <li>King: 0</li>
        </ul>
        <p className="mt-1">
          Two matching cards in the same column score 0 for that column, even a pair of 2s.
        </p>
      </RulesSection>
    </>
  );
}
