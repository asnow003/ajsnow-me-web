'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeftRight, Check, LoaderCircle, RotateCcw, Shuffle, Undo2, X } from 'lucide-react';
import { buildDeck, requeuePosition, shuffle, textSize, type StudyCard } from '@/lib/flashcards/study';
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

export default function StudyView() {
  const ids = (useSearchParams().get('g') ?? '').split(',').filter(Boolean);
  const { groups } = useFlashcards();
  const [session, setSession] = useState<Session | null>(null);
  const [revealed, setRevealed] = useState(false);
  // Every session starts question first; "Flip sides" switches just this session.
  const [answerFirst, setAnswerFirst] = useState(false);

  // Deal once, when the groups first load. Later edits to the groups don't reshuffle a round in progress.
  const idKey = ids.join(',');
  useEffect(() => {
    if (!groups || session) return;
    const wanted = new Set(idKey.split(','));
    setSession(newSession(buildDeck(groups.filter((g) => wanted.has(g.id)))));
  }, [groups, session, idKey]);

  const exitHref = ids.length === 1 ? `/flashcards/group?id=${ids[0]}` : '/flashcards';

  const answer = useCallback((result: Result) => {
    setSession((s) => {
      if (!s || s.index >= s.queue.length) return s;
      const current = s.queue[s.index];
      const queue = [...s.queue];
      if (result === 'missed') queue.splice(requeuePosition(s.index, queue.length), 0, current);
      const results = current.key in s.results ? s.results : { ...s.results, [current.key]: result };
      return { ...s, queue, results, index: s.index + 1 };
    });
    setRevealed(false);
  }, []);

  const toggleDirection = () => {
    setAnswerFirst((a) => !a);
    setRevealed(false);
  };

  const restart = (onlyMissed: boolean) => {
    if (!session) return;
    const cards = onlyMissed ? session.cards.filter((c) => session.results[c.key] === 'missed') : session.cards;
    setSession(newSession(cards));
    setRevealed(false);
  };

  const finished = session !== null && session.queue.length > 0 && session.index >= session.queue.length;
  const current = session && !finished ? session.queue[session.index] : null;

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
          <p className="font-display text-2xl font-semibold">No cards to study</p>
          <p className="mt-2 text-ink/60">Add some cards to this group first.</p>
          <Link href={exitHref} className="mt-6 inline-flex h-11 items-center rounded-xl bg-fc px-5 font-medium text-white">
            Go back
          </Link>
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
        <Summary session={session} exitHref={exitHref} onRestart={restart} />
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
                      className="flex h-14 items-center justify-center gap-2 rounded-2xl border-2 border-[#E11D48]/25 bg-white text-lg font-semibold text-[#BE123C] shadow-sm transition hover:border-[#E11D48]/50 hover:bg-[#FFF1F2] active:scale-[0.98]"
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
      className={`relative flex min-h-[min(58svh,480px)] flex-col overflow-hidden rounded-[28px] bg-white shadow-[0_12px_40px_-12px_rgba(31,29,43,0.25)] transition-shadow [grid-area:1/1] ${ring}`}
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
}: {
  session: Session;
  exitHref: string;
  onRestart: (onlyMissed: boolean) => void;
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
        <div className="rounded-[28px] bg-white px-6 py-8 text-center shadow-[0_12px_40px_-12px_rgba(31,29,43,0.25)] ring-1 ring-ink/[0.07] sm:py-10">
          <div className="relative mx-auto h-36 w-36">
            <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
              <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(31,29,43,0.07)" strokeWidth="10" />
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
          <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:justify-center">
            {missedCards.length > 0 && (
              <Button onClick={() => onRestart(true)}>
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Practice the {missedCards.length} missed
              </Button>
            )}
            <Button variant={missedCards.length ? 'secondary' : 'primary'} onClick={() => onRestart(false)}>
              <Shuffle className="h-4 w-4" aria-hidden="true" />
              Shuffle &amp; go again
            </Button>
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
                <li key={c.key} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-ink/[0.06]">
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
