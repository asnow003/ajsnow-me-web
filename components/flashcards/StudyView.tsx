'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeftRight, Check, LoaderCircle, Play, RotateCcw, Shuffle, Undo2, X } from 'lucide-react';
import { isDue, nextReview } from '@/lib/flashcards/review';
import { ASK_SIZE_ABOVE, SESSION_SIZES, buildDeck, pickForSession, requeuePosition, shuffle, textSize, type StudyCard, studyHref } from '@/lib/flashcards/study';
import type { Review } from '@/lib/flashcards/types';
import { useFlashcards } from './FlashcardsShell';
import Formatted from './Formatted';
import { Button, cardCount } from './ui';

type Result = 'got' | 'missed';

interface Session {
  // Every card in this round, once each.
  cards: StudyCard[];
  // The order cards are asked in. Missed cards are put back in a few places later.
  queue: StudyCard[];
  index: number;
  // How each card went the first time it was asked.
  results: Record<string, Result>;
}

function newSession(cards: StudyCard[]): Session {
  const shuffled = shuffle(cards);
  return { cards: shuffled, queue: shuffled, index: 0, results: {} };
}

const SIZE_KEY = 'flashcards.sessionSize';

function readSize(): number | null {
  try {
    const n = Number(localStorage.getItem(SIZE_KEY));
    return n > 0 ? n : null;
  } catch {
    return null;
  }
}

// Review updates wait this long and go out together, so a quick run of answers is one save per group.
const SAVE_DELAY_MS = 2000;

export default function StudyView() {
  const params = useSearchParams();
  const ids = (params.get('g') ?? '').split(',').filter(Boolean);
  const mode = params.get('mode');
  const dueOnly = mode === 'due';
  const missedOnly = mode === 'missed';
  const { groups, store, save } = useFlashcards();
  const [session, setSession] = useState<Session | null>(null);
  // How many cards each round takes (null for all), and whether we're still asking.
  const [size, setSize] = useState<number | null>(null);
  const [asking, setAsking] = useState(false);
  // Cards already studied in earlier rounds of this visit, so "Next 10" moves on to new ones.
  const studied = useRef(new Set<string>());
  const [revealed, setRevealed] = useState(false);
  // Every session starts question first; "Flip sides" switches just this session.
  const [answerFirst, setAnswerFirst] = useState(false);

  // The cards this visit can study: the chosen groups, only what's due in "due" mode, minus earlier rounds.
  const idKey = ids.join(',');
  const pool = useCallback(() => {
    const wanted = new Set(idKey.split(','));
    const deck = buildDeck((groups ?? []).filter((g) => wanted.has(g.id)));
    return deck.filter(
      (c) =>
        (!dueOnly || isDue(c.card)) && (!missedOnly || (c.card.review?.lapses ?? 0) > 0) && !studied.current.has(c.key),
    );
  }, [groups, idKey, dueOnly, missedOnly]);

  const startRound = useCallback(
    (roundSize: number | null) => {
      const cards = pickForSession(pool(), roundSize);
      cards.forEach((c) => studied.current.add(c.key));
      setSession(newSession(cards));
      setRevealed(false);
      setAsking(false);
    },
    [pool],
  );

  // When the groups first load: small decks start right away, bigger ones ask how many cards.
  // Later edits to the groups don't reshuffle a round in progress.
  const dealt = useRef(false);
  useEffect(() => {
    if (!groups || dealt.current) return;
    dealt.current = true;
    if (pool().length > ASK_SIZE_ABOVE) {
      setSize(readSize() ?? SESSION_SIZES[0]);
      setAsking(true);
    } else startRound(null);
  }, [groups, pool, startRound]);

  const chooseSize = (n: number | null) => {
    setSize(n);
    try {
      localStorage.setItem(SIZE_KEY, String(n ?? 0));
    } catch {
      // Private browsing: not remembered.
    }
  };

  const exitHref = ids.length === 1 ? `/flashcards/group?id=${ids[0]}` : '/flashcards';

  // New review schedules waiting to be saved, by group and card.
  const pending = useRef(new Map<string, Map<string, Review>>());
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const flush = useCallback(() => {
    clearTimeout(timer.current);
    const batches = Array.from(pending.current);
    pending.current = new Map();
    for (const [groupId, updates] of batches) {
      save(() =>
        store.changeCards(groupId, (cards) =>
          cards.map((c) => (updates.has(c.id) ? { ...c, review: updates.get(c.id) } : c)),
        ),
      );
    }
  }, [save, store]);

  // Save whatever's waiting when leaving the page or putting the phone down.
  useEffect(() => {
    const onHide = () => document.visibilityState === 'hidden' && flush();
    document.addEventListener('visibilitychange', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      flush();
    };
  }, [flush]);

  const answer = useCallback(
    (result: Result) => {
      if (!session || session.index >= session.queue.length) return;
      const item = session.queue[session.index];
      // Only the first answer to a card in a session moves its schedule.
      if (!(item.key in session.results)) {
        const byGroup = pending.current.get(item.group.id) ?? new Map<string, Review>();
        byGroup.set(item.card.id, nextReview(item.card.review, result === 'got'));
        pending.current.set(item.group.id, byGroup);
        clearTimeout(timer.current);
        timer.current = setTimeout(flush, SAVE_DELAY_MS);
      }
      const queue = [...session.queue];
      if (result === 'missed') queue.splice(requeuePosition(session.index, queue.length), 0, item);
      const results = item.key in session.results ? session.results : { ...session.results, [item.key]: result };
      setSession({ ...session, queue, results, index: session.index + 1 });
      setRevealed(false);
    },
    [session, flush],
  );

  const toggleDirection = () => {
    setAnswerFirst((a) => !a);
    setRevealed(false);
  };

  // After a round: practice just the missed cards, go again with the same cards, or deal the next batch.
  const restart = (how: 'missed' | 'again' | 'next') => {
    if (!session) return;
    if (how === 'next') return startRound(size);
    const cards = how === 'missed' ? session.cards.filter((c) => session.results[c.key] === 'missed') : session.cards;
    setSession(newSession(cards));
    setRevealed(false);
  };
  const remaining = session ? pool().length : 0;

  const finished = session !== null && session.queue.length > 0 && session.index >= session.queue.length;
  const current = session && !finished ? session.queue[session.index] : null;

  useEffect(() => {
    if (finished) flush();
  }, [finished, flush]);

  // Keyboard: space or enter flips, arrows answer once the answer is showing.
  useEffect(() => {
    if (!current) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setRevealed((r) => !r);
      } else if (revealed && e.key === 'ArrowRight') answer('got');
      else if (revealed && e.key === 'ArrowLeft') answer('missed');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, revealed, answer]);

  if (asking && groups) {
    return (
      <SizePicker
        available={pool().length}
        label={dueOnly ? 'due' : missedOnly ? 'missed before' : 'cards'}
        size={size}
        onSize={chooseSize}
        onStart={() => startRound(size)}
        exitHref={exitHref}
      />
    );
  }

  if (!groups || !session) {
    return (
      <div className="grid min-h-svh place-items-center text-fc">
        <LoaderCircle className="h-9 w-9 animate-spin" aria-label="Loading" />
      </div>
    );
  }

  if (session.cards.length === 0) {
    return (
      <div className="grid min-h-svh place-items-center p-6 text-center">
        <div>
          <p className="font-display text-2xl font-semibold">
            {dueOnly ? 'All caught up' : missedOnly ? 'Nothing missed yet' : 'No cards to study'}
          </p>
          <p className="mt-2 text-ink/60">
            {dueOnly
              ? 'Nothing is due for review right now.'
              : missedOnly
                ? "You haven't missed any of these cards."
                : 'Add some cards to this group first.'}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {(dueOnly || missedOnly) && (
              <Link
                href={studyHref(ids, 'all')}
                onClick={() => {
                  dealt.current = false;
                  setSession(null);
                }}
                className="inline-flex h-11 items-center rounded-xl bg-fc px-5 font-medium text-white"
              >
                Study all anyway
              </Link>
            )}
            <Link
              href={exitHref}
              className={`inline-flex h-11 items-center rounded-xl px-5 font-medium ${dueOnly ? 'text-ink/70 hover:bg-ink/5' : 'bg-fc text-white'}`}
            >
              Go back
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const got = Object.values(session.results).filter((r) => r === 'got').length;
  const missed = Object.values(session.results).filter((r) => r === 'missed').length;
  const mixed = new Set(session.cards.map((c) => c.group.id)).size > 1;

  return (
    <div className="flex h-svh flex-col overflow-hidden">
      <header className="shrink-0 px-3 pt-[max(12px,env(safe-area-inset-top))] sm:px-6 sm:pt-5">
        <div className="mx-auto flex max-w-3xl items-center gap-2 sm:gap-3">
          <Link
            href={exitHref}
            aria-label="End session"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink/60 hover:bg-ink/5 hover:text-ink"
          >
            <X className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="h-2 overflow-hidden rounded-full bg-ink/[0.08]">
              <div
                className="h-full rounded-full bg-fc transition-[width] duration-500 ease-out"
                style={{ width: `${(Math.min(session.index, session.queue.length) / session.queue.length) * 100}%` }}
              />
            </div>
          </div>
          <span className="shrink-0 text-sm font-medium tabular-nums text-ink/60">
            {Math.min(session.index + 1, session.queue.length)} / {session.queue.length}
          </span>
          {!finished && (
            <button
              onClick={toggleDirection}
              aria-pressed={answerFirst}
              title={answerFirst ? 'Showing answers first' : 'Showing questions first'}
              className={`flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition ${
                answerFirst ? 'bg-fc text-white' : 'text-ink/60 hover:bg-ink/5 hover:text-ink'
              }`}
            >
              <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">{answerFirst ? 'Answer first' : 'Flip sides'}</span>
            </button>
          )}
        </div>
        {!finished && (got > 0 || missed > 0) && (
          <div className="mx-auto mt-2 flex max-w-3xl justify-center gap-4 text-xs font-medium text-ink/50">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-done" /> {got} got it
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-[#E11D48]" /> {missed} missed
            </span>
          </div>
        )}
      </header>

      {finished ? (
        <Summary
          session={session}
          exitHref={exitHref}
          onRestart={restart}
          next={size && remaining > 0 ? Math.min(size, remaining) : 0}
        />
      ) : (
        current && (
          <>
            <main className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
              <div className="m-auto w-full max-w-2xl">
                <FlipCard
                  key={session.index}
                  item={current}
                  showGroup={mixed}
                  answerFirst={answerFirst}
                  revealed={revealed}
                  onFlip={() => setRevealed((r) => !r)}
                  onSwipe={answer}
                />
              </div>
            </main>
            <footer className="shrink-0 px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-2 sm:px-6 sm:pb-8">
              <div className="mx-auto max-w-2xl">
                {revealed ? (
                  <div className="grid animate-fade-in grid-cols-2 gap-3">
                    <button
                      onClick={() => answer('missed')}
                      className="flex h-14 items-center justify-center gap-2 rounded-2xl border-2 border-[#E11D48]/25 bg-surface text-lg font-semibold text-[#E11D48] shadow-sm transition hover:border-[#E11D48]/50 hover:bg-[#E11D48]/10 active:scale-[0.98]"
                    >
                      <Undo2 className="h-5 w-5" aria-hidden="true" />
                      Missed it
                    </button>
                    <button
                      onClick={() => answer('got')}
                      className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-done text-lg font-semibold text-white shadow-md transition hover:bg-[#178563] active:scale-[0.98]"
                    >
                      <Check className="h-5 w-5" aria-hidden="true" />
                      Got it
                    </button>
                  </div>
                ) : (
                  <Button size="lg" className="w-full rounded-2xl" onClick={() => setRevealed(true)}>
                    Show {answerFirst ? 'question' : 'answer'}
                  </Button>
                )}
                <p className="mt-3 hidden text-center text-xs text-ink/40 [@media(hover:hover)]:block">
                  Space to flip · ← missed it · → got it
                </p>
              </div>
            </footer>
          </>
        )
      )}
    </div>
  );
}

const SIZES = {
  xl: 'text-center font-display text-3xl font-medium leading-tight sm:text-5xl',
  lg: 'text-center font-display text-2xl font-medium leading-snug sm:text-[2rem]',
  md: 'font-display text-xl leading-relaxed sm:text-2xl',
  sm: 'text-base leading-relaxed sm:text-lg',
};

const SWIPE_DISTANCE = 90;

function FlipCard({
  item,
  showGroup,
  answerFirst,
  revealed,
  onFlip,
  onSwipe,
}: {
  item: StudyCard;
  showGroup: boolean;
  answerFirst: boolean;
  revealed: boolean;
  onFlip: () => void;
  onSwipe: (result: Result) => void;
}) {
  const [dx, setDx] = useState(0);
  const drag = useRef<{ x: number; y: number; id: number; moved: boolean } | null>(null);
  // A swipe ends with a click on the card; this keeps that click from flipping it.
  const swiped = useRef(false);
  const first = answerFirst ? { label: 'Answer', text: item.card.back } : { label: 'Question', text: item.card.front };
  const second = answerFirst ? { label: 'Question', text: item.card.front } : { label: 'Answer', text: item.card.back };

  // Once the answer shows, swiping right means "got it" and left "missed it".
  const onPointerDown = (e: React.PointerEvent) => {
    if (!revealed || e.pointerType === 'mouse') return;
    drag.current = { x: e.clientX, y: e.clientY, id: e.pointerId, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const x = e.clientX - d.x;
    if (!d.moved && Math.abs(x) > 12 && Math.abs(x) > Math.abs(e.clientY - d.y)) d.moved = true;
    if (d.moved) setDx(x);
  };
  const onPointerEnd = () => {
    const d = drag.current;
    drag.current = null;
    if (!d?.moved) return;
    swiped.current = true;
    setTimeout(() => (swiped.current = false), 50);
    if (Math.abs(dx) > SWIPE_DISTANCE) onSwipe(dx > 0 ? 'got' : 'missed');
    else setDx(0);
  };

  const tint = dx > 30 ? 'got' : dx < -30 ? 'missed' : null;

  return (
    <div
      className="animate-card-in touch-pan-y select-none [perspective:1800px]"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      style={{
        transform: dx ? `translateX(${dx}px) rotate(${dx / 25}deg)` : undefined,
        transition: drag.current ? 'none' : 'transform 200ms ease-out',
      }}
    >
      <button
        type="button"
        onClick={() => !swiped.current && onFlip()}
        aria-label={revealed ? `${second.label}. Tap to see the ${first.label.toLowerCase()} again.` : `Show the ${second.label.toLowerCase()}`}
        className="grid w-full text-left outline-none transition-transform duration-500 [transform-style:preserve-3d] focus-visible:ring-4 focus-visible:ring-fc/30 motion-reduce:transition-none"
        style={{ transform: revealed ? 'rotateY(180deg)' : undefined, borderRadius: 28 }}
      >
        <Face label={first.label} text={first.text} item={item} showGroup={showGroup} hint="Tap to flip" />
        <Face label={second.label} text={second.text} item={item} showGroup={showGroup} back tint={tint} />
      </button>
    </div>
  );
}

function Face({
  label,
  text,
  item,
  showGroup,
  back = false,
  hint,
  tint,
}: {
  label: string;
  text: string;
  item: StudyCard;
  showGroup: boolean;
  back?: boolean;
  hint?: string;
  tint?: Result | null;
}) {
  const size = textSize(text);
  const ring = tint === 'got' ? 'ring-4 ring-done/60' : tint === 'missed' ? 'ring-4 ring-[#E11D48]/50' : 'ring-1 ring-ink/[0.07]';
  return (
    <div
      className={`relative flex min-h-[min(58svh,480px)] flex-col overflow-hidden rounded-[28px] bg-surface shadow-[0_12px_40px_-12px_rgba(31,29,43,0.25)] transition-shadow [grid-area:1/1] ${ring}`}
      style={{
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
        transform: back ? 'rotateY(180deg)' : undefined,
      }}
    >
      <span className="absolute inset-x-0 top-0 h-1.5" style={{ background: item.group.color }} />
      <div className="flex items-center gap-2 px-5 pt-5 sm:px-8 sm:pt-7">
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${back ? 'text-white' : 'text-ink/50'}`}
          style={back ? { background: item.group.color } : { background: 'rgba(31,29,43,0.05)' }}
        >
          {label}
        </span>
        {showGroup && <span className="truncate text-xs font-medium text-ink/40">{item.group.name}</span>}
      </div>
      <div className={`flex flex-1 flex-col justify-center px-6 py-8 sm:px-12 sm:py-10 ${size === 'xl' || size === 'lg' ? 'items-center' : ''}`}>
        <Formatted text={text} className={SIZES[size]} />
      </div>
      {hint && (
        <p className="pb-5 text-center text-xs font-medium uppercase tracking-[0.14em] text-ink/30 sm:pb-7">{hint}</p>
      )}
    </div>
  );
}

function Summary({
  session,
  exitHref,
  onRestart,
  next,
}: {
  session: Session;
  exitHref: string;
  onRestart: (how: 'missed' | 'again' | 'next') => void;
  // How many cards the next batch would have, or 0 when this round took everything.
  next: number;
}) {
  const total = session.cards.length;
  const missedCards = session.cards.filter((c) => session.results[c.key] === 'missed');
  const got = total - missedCards.length;
  const pct = Math.round((got / total) * 100);
  const headline = pct === 100 ? 'Perfect round!' : pct >= 80 ? 'Great work!' : pct >= 50 ? 'Nice progress' : 'Keep at it';
  const r = 52;
  const circumference = 2 * Math.PI * r;

  return (
    <main className="flex-1 overflow-y-auto px-4 pb-[max(24px,env(safe-area-inset-bottom))] pt-6 sm:px-6">
      <div className="mx-auto max-w-2xl animate-card-in">
        <div className="rounded-[28px] bg-surface px-6 py-8 text-center shadow-[0_12px_40px_-12px_rgba(31,29,43,0.25)] ring-1 ring-ink/[0.07] sm:py-10">
          <div className="relative mx-auto h-36 w-36">
            <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
              <circle cx="60" cy="60" r={r} fill="none" stroke="currentColor" className="text-ink/10" strokeWidth="10" />
              <circle
                cx="60"
                cy="60"
                r={r}
                fill="none"
                stroke="#1D9E75"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - got / total)}
                className="transition-[stroke-dashoffset] duration-700"
              />
            </svg>
            <div className="absolute inset-0 grid place-items-center">
              <span className="font-display text-4xl font-semibold tabular-nums">{pct}%</span>
            </div>
          </div>
          <h2 className="mt-5 font-display text-3xl font-semibold tracking-tight">{headline}</h2>
          <p className="mt-2 text-ink/60">
            You got {got} of {cardCount(total)} on the first try.
          </p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink/45">
            Cards you got come back in a few days, a bit later each time. Missed ones are due again next session.
          </p>
          <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:justify-center">
            {missedCards.length > 0 && (
              <Button onClick={() => onRestart('missed')}>
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Practice the {missedCards.length} missed
              </Button>
            )}
            {next > 0 ? (
              <Button variant={missedCards.length ? 'secondary' : 'primary'} onClick={() => onRestart('next')}>
                <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                Next {next} cards
              </Button>
            ) : (
              <Button variant={missedCards.length ? 'secondary' : 'primary'} onClick={() => onRestart('again')}>
                <Shuffle className="h-4 w-4" aria-hidden="true" />
                Shuffle &amp; go again
              </Button>
            )}
            <Link
              href={exitHref}
              className="inline-flex h-11 items-center justify-center rounded-xl px-4 font-medium text-ink/70 hover:bg-ink/5 hover:text-ink"
            >
              Done
            </Link>
          </div>
        </div>

        {missedCards.length > 0 && (
          <section className="mt-8">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-ink/45">To review</h3>
            <ul className="space-y-3">
              {missedCards.map((c) => (
                <li key={c.key} className="overflow-hidden rounded-2xl bg-surface shadow-sm ring-1 ring-ink/[0.06]">
                  <div className="flex">
                    <span className="w-1.5 shrink-0" style={{ background: c.group.color }} />
                    <div className="grid flex-1 gap-2 p-4 sm:grid-cols-2 sm:gap-6">
                      <Formatted text={c.card.front} className="font-display font-medium" />
                      <Formatted text={c.card.back} className="text-sm text-ink/70" />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}

// Asked before a round when there are more than a handful of cards.
function SizePicker({
  available,
  label,
  size,
  onSize,
  onStart,
  exitHref,
}: {
  available: number;
  label: string;
  size: number | null;
  onSize: (size: number | null) => void;
  onStart: () => void;
  exitHref: string;
}) {
  const options: (number | null)[] = [...SESSION_SIZES.filter((n) => n < available), null];
  const chosen = size !== null && size >= available ? null : size;
  return (
    <div className="flex min-h-svh flex-col px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-[max(12px,env(safe-area-inset-top))] sm:px-6">
      <div className="mx-auto w-full max-w-md">
        <Link
          href={exitHref}
          aria-label="Back"
          className="-ml-2 grid h-10 w-10 place-items-center rounded-full text-ink/60 hover:bg-ink/5 hover:text-ink"
        >
          <X className="h-5 w-5" />
        </Link>
      </div>
      <div className="m-auto w-full max-w-md animate-card-in rounded-[28px] bg-surface p-6 text-center shadow-[0_12px_40px_-12px_rgba(0,0,0,0.25)] ring-1 ring-ink/[0.07] sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-ink/45">
          {available} {label}
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">How many this time?</h1>
        <p className="mx-auto mt-2 max-w-xs text-sm text-ink/55">
          Cards due for review come first, then new ones. Each session picks up where the last left off.
        </p>
        <div role="radiogroup" aria-label="Cards this session" className="mt-6 grid grid-cols-4 gap-2">
          {options.map((n) => (
            <button
              key={n ?? 'all'}
              role="radio"
              aria-checked={chosen === n}
              onClick={() => onSize(n)}
              className={`h-14 rounded-2xl text-lg font-semibold tabular-nums transition ${
                chosen === n ? 'bg-fc text-white shadow-md' : 'bg-ink/[0.05] text-ink/70 hover:bg-ink/10'
              }`}
            >
              {n ?? 'All'}
            </button>
          ))}
        </div>
        <Button size="lg" className="mt-6 w-full rounded-2xl" onClick={onStart}>
          <Play className="h-5 w-5 fill-current" aria-hidden="true" />
          Start {chosen ?? available} cards
        </Button>
      </div>
    </div>
  );
}
