'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, PartyPopper, Pencil } from 'lucide-react';
import { RulesSection } from '@/components/games/RulesCard';
import { PlayerDot } from '@/components/games/ui';
import {
  SUITS, bidOrder, dealerIndex, inputsOf, isPending, roundName, roundScore, roundSequence, scoresFor,
  type EstimationInputs, type RoundSpec, type Suit,
} from '@/lib/games/estimation';
import type { Game, Player, Round } from '@/lib/games/types';
import type { GameScorer, ScorerPanelProps } from '../scorers';

function SuitMark({ suit }: { suit: Suit | null }) {
  const s = SUITS.find((x) => x.suit === suit);
  if (!s) return null;
  return <span className={`text-[1.2em] leading-none ${s.red ? 'text-danger' : 'text-ink'}`}>{s.symbol}</span>;
}

export const estimationScorer: GameScorer = {
  Panel: EstimationPanel,
  Rules: EstimationRules,

  progress(game) {
    const total = roundSequence(game.playerIds.length).length;
    const done = game.rounds.filter((r) => !isPending(r)).length;
    return { current: Math.min(game.rounds.length + (game.rounds.some(isPending) ? 0 : 1), total), total, done: done >= total };
  },

  roundLabel(round, index) {
    const i = inputsOf(round);
    return (
      <span className="whitespace-nowrap">
        {index + 1}
        {i.kind === 'normal' ? (
          <> · <SuitMark suit={i.trump} /></>
        ) : (
          <span className="text-xs"> · {i.kind === 'no-trump' ? 'NT' : 'Mis'}</span>
        )}
      </span>
    );
  },

  cell(round, pid) {
    const i = inputsOf(round);
    if (!i.tricks) return { score: null, detail: `bid ${i.bids[pid] ?? '–'}` };
    return { score: round.scores[pid] ?? 0, detail: `${i.bids[pid]}/${i.tricks[pid]}` };
  },

  canEdit: (round) => !isPending(round),
};

type Mode =
  | { kind: 'new'; spec: RoundSpec; index: number }
  | { kind: 'playing'; index: number }
  | { kind: 'change-bids'; index: number }
  | { kind: 'tricks'; index: number }
  | { kind: 'edit'; index: number }
  | { kind: 'done' };

function EstimationPanel({ game, def, players, editRound, onDoneEditing, saveRounds, onAllRoundsDone }: ScorerPanelProps) {
  const seq = roundSequence(game.playerIds.length);
  const last = game.rounds[game.rounds.length - 1];
  const pending = last && isPending(last);
  const [step, setStep] = useState<'tricks' | 'change-bids' | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editRound !== null) ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [editRound]);

  // Leave the tricks/change-bids step once the pending round it belonged to is gone (saved or changed elsewhere).
  useEffect(() => {
    if (!pending) setStep(null);
  }, [pending]);

  const mode: Mode =
    editRound !== null && game.rounds[editRound]
      ? { kind: 'edit', index: editRound }
      : pending
        ? { kind: step ?? 'playing', index: game.rounds.length - 1 }
        : game.rounds.length >= seq.length
          ? { kind: 'done' }
          : { kind: 'new', spec: seq[game.rounds.length], index: game.rounds.length };

  const replace = (index: number, inputs: EstimationInputs) =>
    game.rounds.map((r, i) => (i === index ? { scores: scoresFor(inputs), inputs: { ...inputs } } : r));

  const saveCompleted = async (rounds: Round[]) => {
    await saveRounds(rounds);
    if (rounds.length >= seq.length && !rounds.some(isPending)) onAllRoundsDone();
  };

  const shell = (children: React.ReactNode) => (
    <div ref={ref} className="scroll-mt-28 rounded-3xl bg-white p-4 shadow-md sm:p-5">
      {children}
    </div>
  );

  if (mode.kind === 'done') {
    return shell(
      <div className="py-2 text-center">
        <PartyPopper className="mx-auto h-8 w-8" style={{ color: def.color }} aria-hidden="true" />
        <p className="mt-2 font-display text-xl font-semibold">All {seq.length} rounds played</p>
        <p className="mt-1 text-sm text-ink/60">Finish the game to record the winner.</p>
      </div>,
    );
  }

  if (mode.kind === 'playing') {
    const inputs = inputsOf(last);
    const totalBid = Object.values(inputs.bids).reduce((a, b) => a + b, 0);
    return shell(
      <>
        <RoundHeading index={mode.index} total={seq.length} spec={inputs} trump={inputs.trump} />
        <p className="mt-1 text-sm text-ink/60">
          {players.get(game.playerIds[dealerIndex(mode.index, game.playerIds.length)])?.name} deals · {totalBid} bid on{' '}
          {inputs.cards} {inputs.cards === 1 ? 'card' : 'cards'}
        </p>
        <ul className="mt-3 grid grid-cols-2 gap-2">
          {bidOrder(game.playerIds, mode.index).map((pid) => (
            <li key={pid} className="flex items-center gap-2 rounded-xl bg-cream px-2 py-1.5">
              <PlayerDot player={players.get(pid)} size="sm" />
              <span className="min-w-0 flex-1 truncate font-medium">{players.get(pid)?.name}</span>
              <span className="font-display text-lg font-semibold">{inputs.bids[pid]}</span>
            </li>
          ))}
        </ul>
        <button
          onClick={() => setStep('tricks')}
          className="mt-4 flex h-14 w-full items-center justify-center rounded-2xl font-display text-xl font-semibold text-white shadow-md active:scale-[0.98]"
          style={{ background: def.color }}
        >
          Enter tricks taken
        </button>
        {inputs.kind !== 'misere' && (
          <button onClick={() => setStep('change-bids')} className="mx-auto mt-3 flex items-center gap-1 text-sm text-ink/60 underline hover:text-ink">
            <Pencil className="h-4 w-4" aria-hidden="true" />
            Change bids or trump
          </button>
        )}
      </>,
    );
  }

  if (mode.kind === 'new') {
    const { spec, index } = mode;
    const blank: EstimationInputs = {
      cards: spec.cards,
      kind: spec.kind,
      trump: null,
      bids: spec.kind === 'misere' ? Object.fromEntries(game.playerIds.map((p) => [p, 0])) : {},
      tricks: null,
    };
    // Misère: everyone bids 0, so go straight to tricks.
    return shell(
      <RoundEditor
        key={`new-${index}`}
        game={game}
        def={def}
        players={players}
        index={index}
        total={seq.length}
        initial={blank}
        showBids={spec.kind !== 'misere'}
        showTricks={spec.kind === 'misere'}
        saveLabel={spec.kind === 'misere' ? `Save round ${index + 1}` : 'Lock in bids'}
        onSave={(inputs) =>
          spec.kind === 'misere'
            ? saveCompleted([...game.rounds, { scores: scoresFor(inputs), inputs: { ...inputs } }])
            : saveRounds([...game.rounds, { scores: {}, inputs: { ...inputs } }])
        }
      />,
    );
  }

  const round = game.rounds[mode.index];
  const inputs = inputsOf(round);

  if (mode.kind === 'change-bids') {
    return shell(
      <RoundEditor
        key={`bids-${mode.index}`}
        game={game}
        def={def}
        players={players}
        index={mode.index}
        total={seq.length}
        initial={inputs}
        showBids
        saveLabel="Save bids"
        onCancel={() => setStep(null)}
        onSave={async (next) => {
          await saveRounds(replace(mode.index, next));
          setStep(null);
        }}
      />,
    );
  }

  if (mode.kind === 'tricks') {
    return shell(
      <RoundEditor
        key={`tricks-${mode.index}`}
        game={game}
        def={def}
        players={players}
        index={mode.index}
        total={seq.length}
        initial={{ ...inputs, tricks: {} }}
        showTricks
        saveLabel={`Save round ${mode.index + 1}`}
        onCancel={() => setStep(null)}
        onSave={(next) => saveCompleted(replace(mode.index, next))}
      />,
    );
  }

  return shell(
    <RoundEditor
      key={`edit-${mode.index}`}
      game={game}
      def={def}
      players={players}
      index={mode.index}
      total={seq.length}
      initial={inputs}
      showBids={inputs.kind !== 'misere'}
      showTricks
      editing
      saveLabel="Save changes"
      onCancel={onDoneEditing}
      onSave={async (next) => {
        await saveRounds(replace(mode.index, next));
        onDoneEditing();
      }}
    />,
  );
}

function RoundHeading({ index, total, spec, trump }: { index: number; total: number; spec: RoundSpec; trump: Suit | null }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <h2 className="font-display text-2xl font-semibold">
        Round {index + 1} <span className="text-base font-normal text-ink/50">of {total}</span>
      </h2>
      <span className="whitespace-nowrap font-display text-lg font-medium">
        {roundName(spec)} {trump && <SuitMark suit={trump} />}
      </span>
    </div>
  );
}

function RoundEditor({
  game,
  def,
  players,
  index,
  total,
  initial,
  showBids = false,
  showTricks = false,
  editing = false,
  saveLabel,
  onSave,
  onCancel,
}: {
  game: Game;
  def: { color: string };
  players: Map<string, Player>;
  index: number;
  total: number;
  initial: EstimationInputs;
  showBids?: boolean;
  showTricks?: boolean;
  editing?: boolean;
  saveLabel: string;
  onSave: (inputs: EstimationInputs) => Promise<unknown> | void;
  onCancel?: () => void;
}) {
  const [trump, setTrump] = useState<Suit | null>(initial.trump);
  const [bids, setBids] = useState<Record<string, number>>(initial.bids);
  const [tricks, setTricks] = useState<Record<string, number>>(initial.tricks ?? {});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const { cards, kind } = initial;
  const order = bidOrder(game.playerIds, index);
  const dealer = game.playerIds[dealerIndex(index, game.playerIds.length)];
  const totalBid = Object.values(bids).reduce((a, b) => a + b, 0);
  const totalTricks = Object.values(tricks).reduce((a, b) => a + b, 0);
  const needsTrump = kind === 'normal' && showBids;

  const save = async () => {
    if (needsTrump && !trump) return setError('Pick the trump suit.');
    if (showBids && order.some((p) => bids[p] === undefined)) return setError('Enter a bid for everyone.');
    if (showTricks && order.some((p) => tricks[p] === undefined)) return setError('Enter tricks for everyone.');
    if (showTricks && totalTricks !== cards)
      return setError(`Tricks add up to ${totalTricks}, but ${cards} ${cards === 1 ? 'was' : 'were'} played.`);
    setBusy(true);
    try {
      await onSave({ cards, kind, trump: kind === 'normal' ? trump : null, bids, tricks: showTricks ? tricks : null });
    } catch {
      setError("Couldn't save. Check your connection and try again.");
    }
    setBusy(false);
  };

  const left = cards - totalTricks;

  return (
    <>
      <RoundHeading index={index} total={total} spec={initial} trump={needsTrump ? null : initial.trump} />
      <p className="mt-1 text-sm text-ink/60">
        {editing
          ? 'Correct this round and the totals update.'
          : kind === 'misere'
            ? 'Misère: everyone bids 0. Enter the tricks each player took.'
            : `${players.get(dealer)?.name} deals. ${showBids ? `Bidding starts with ${players.get(order[0])?.name}.` : ''}`}
      </p>

      {needsTrump && (
        <div className="mt-4">
          <div className="mb-1.5 text-sm font-medium text-ink/60">Trump</div>
          <div className="grid grid-cols-4 gap-2">
            {SUITS.map((s) => (
              <button
                key={s.suit}
                onClick={() => {
                  setTrump(s.suit);
                  setError('');
                }}
                aria-pressed={trump === s.suit}
                aria-label={{ S: 'Spades', H: 'Hearts', D: 'Diamonds', C: 'Clubs' }[s.suit]}
                className={`h-12 rounded-xl border-2 text-3xl leading-none transition active:scale-95 ${
                  trump === s.suit ? 'text-white' : s.red ? 'border-ink/10 text-danger' : 'border-ink/10 text-ink'
                }`}
                style={trump === s.suit ? { background: def.color, borderColor: def.color } : undefined}
              >
                {s.symbol}
              </button>
            ))}
          </div>
        </div>
      )}

      <ul className="mt-4 flex flex-col gap-2">
        {order.map((pid) => {
          const bid = bids[pid];
          const took = tricks[pid];
          const points = showTricks && bid !== undefined && took !== undefined ? roundScore(bid, took) : null;
          return (
            <li key={pid} className="rounded-2xl border-2 border-ink/10 p-2.5">
              <div className="mb-2 flex items-center gap-2">
                <PlayerDot player={players.get(pid)} size="sm" />
                <span className="min-w-0 flex-1 truncate font-display text-lg font-medium">{players.get(pid)?.name}</span>
                {pid === dealer && <span className="rounded-full bg-playing-bg px-2 py-0.5 text-xs font-medium text-playing-text">Dealer</span>}
                {showTricks && !showBids && <span className="text-sm text-ink/60">bid {bid}</span>}
                {points !== null && (
                  <span className={`w-10 text-right font-display text-lg font-semibold ${points >= 0 ? 'text-done' : 'text-danger'}`}>
                    {points > 0 ? `+${points}` : points}
                  </span>
                )}
              </div>
              {showBids && (
                <NumberRow
                  label={showTricks ? 'Bid' : undefined}
                  max={cards}
                  value={bid}
                  color={def.color}
                  onChange={(n) => {
                    setBids((b) => ({ ...b, [pid]: n }));
                    setError('');
                  }}
                />
              )}
              {showTricks && (
                <NumberRow
                  label={showBids ? 'Took' : undefined}
                  max={cards}
                  value={took}
                  color={def.color}
                  onChange={(n) => {
                    setTricks((t) => ({ ...t, [pid]: n }));
                    setError('');
                  }}
                />
              )}
            </li>
          );
        })}
      </ul>

      <p className={`mt-3 text-center text-sm ${showTricks && left < 0 ? 'font-medium text-danger' : 'text-ink/60'}`}>
        {showTricks
          ? left === 0
            ? `All ${cards} tricks counted`
            : left > 0
              ? `${totalTricks} of ${cards} tricks counted`
              : `${-left} too many tricks counted`
          : `Bids so far: ${totalBid} for ${cards} ${cards === 1 ? 'card' : 'cards'}`}
      </p>
      {error && <p className="mt-2 text-center font-medium text-danger">{error}</p>}

      <button
        onClick={save}
        disabled={busy}
        className="mt-3 flex h-14 w-full items-center justify-center gap-2 rounded-2xl font-display text-xl font-semibold text-white shadow-md active:scale-[0.98] disabled:opacity-70"
        style={{ background: def.color }}
      >
        <Check className="h-6 w-6" aria-hidden="true" />
        {saveLabel}
      </button>
      {onCancel && (
        <button onClick={onCancel} className="mx-auto mt-3 block text-sm text-ink/60 underline hover:text-ink">
          Cancel
        </button>
      )}
    </>
  );
}

function NumberRow({
  label,
  max,
  value,
  color,
  onChange,
}: {
  label?: string;
  max: number;
  value: number | undefined;
  color: string;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      {label && <span className="w-9 shrink-0 text-xs font-medium uppercase text-ink/50">{label}</span>}
      <div className="grid flex-1 gap-1" style={{ gridTemplateColumns: `repeat(${max + 1}, minmax(0, 1fr))` }}>
        {Array.from({ length: max + 1 }, (_, n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            aria-pressed={value === n}
            aria-label={`${label ?? 'Value'} ${n}`}
            className={`h-11 rounded-lg font-display text-lg font-medium transition active:scale-95 ${
              value === n ? 'text-white shadow' : 'bg-cream text-ink hover:bg-ink/10'
            }`}
            style={value === n ? { background: color } : undefined}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

function EstimationRules() {
  return (
    <>
      <p>Bid how many tricks you&apos;ll take each round. Highest total after the last round wins.</p>
      <RulesSection title="Rounds">
        <p>
          1, 2, 3, 4, 5, 6, 7 cards, then 7 No Trump, 7 Misère, then back down 6, 5, 4, 3, 2, 1. With too many players
          for everyone to get 7 cards plus a trump card, the top round is smaller (6 for 8 players, and so on).
        </p>
      </RulesSection>
      <RulesSection title="Bidding">
        <p>
          The dealer turns up trump, then bidding starts left of the dealer and ends with the dealer. In the Misère
          round everyone bids 0, and there&apos;s no trump in No Trump or Misère.
        </p>
      </RulesSection>
      <RulesSection title="Scoring">
        <ul className="list-disc space-y-0.5 pl-5">
          <li>Make your bid exactly: 10 points plus 2 for every trick you bid.</li>
          <li>Miss it: lose 2 points for every trick you were off by.</li>
        </ul>
        <p className="mt-1 text-ink/60">Bid 0, take 0: 10. Bid 2, take 2: 14. Bid 2, take 1: −2.</p>
      </RulesSection>
    </>
  );
}
