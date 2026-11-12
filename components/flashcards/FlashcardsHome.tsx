'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Check, Layers, LoaderCircle, Play, Plus, Shuffle, X } from 'lucide-react';
import { countDue } from '@/lib/flashcards/review';
import { studyHref } from '@/lib/flashcards/study';
import type { Group } from '@/lib/flashcards/types';
import { useFlashcards } from './FlashcardsShell';
import { GroupDialog } from './dialogs';
import { AccountMenu, Button, PageBody, TopBar, cardCount } from './ui';

export default function FlashcardsHome() {
  const { groups } = useFlashcards();
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  // While mixing, tapping a group selects it instead of opening it.
  const [mixing, setMixing] = useState<Set<string> | null>(null);

  const toggle = (id: string) =>
    setMixing((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const selected = groups?.filter((g) => mixing?.has(g.id)) ?? [];
  const selectedCards = selected.reduce((n, g) => n + g.cards.length, 0);
  const selectedDue = selected.reduce((n, g) => n + countDue(g.cards), 0);
  const studyable = groups?.filter((g) => g.cards.length > 0) ?? [];

  return (
    <>
      <TopBar
        title={
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-fc text-white shadow-sm">
              <Layers className="h-5 w-5" aria-hidden="true" />
            </span>
            <h1 className="font-display text-2xl font-semibold tracking-tight">Flashcards</h1>
          </div>
        }
        right={<AccountMenu />}
      />
      <PageBody>
        {groups === null ? (
          <div className="grid place-items-center py-24 text-fc">
            <LoaderCircle className="h-9 w-9 animate-spin" aria-label="Loading" />
          </div>
        ) : groups.length === 0 ? (
          <EmptyState onCreate={() => setCreating(true)} />
        ) : (
          <>
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <h2 className="mr-auto text-sm font-semibold uppercase tracking-wider text-ink/45">
                {mixing ? 'Pick groups to mix' : `Your groups · ${groups.length}`}
              </h2>
              {mixing ? (
                <Button variant="ghost" onClick={() => setMixing(null)}>
                  <X className="h-4 w-4" aria-hidden="true" />
                  Cancel
                </Button>
              ) : (
                <>
                  {studyable.length > 1 && (
                    <Button variant="secondary" onClick={() => setMixing(new Set())}>
                      <Shuffle className="h-4 w-4" aria-hidden="true" />
                      Mix groups
                    </Button>
                  )}
                  <Button onClick={() => setCreating(true)}>
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    New group
                  </Button>
                </>
              )}
            </div>
            <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
              {groups.map((g) => (
                <li key={g.id}>
                  <GroupTile
                    group={g}
                    selecting={Boolean(mixing)}
                    selected={Boolean(mixing?.has(g.id))}
                    onToggle={() => toggle(g.id)}
                  />
                </li>
              ))}
            </ul>
          </>
        )}
      </PageBody>

      {mixing && (
        <div className="fixed inset-x-0 bottom-0 z-30 animate-sheet-in border-t border-ink/10 bg-surface/95 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_rgba(31,29,43,0.08)] backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 sm:px-6">
            <p className="flex-1 text-sm text-ink/70">
              {selected.length
                ? `${selected.length} ${selected.length === 1 ? 'group' : 'groups'} · ${cardCount(selectedCards)} · ${selectedDue} due`
                : 'Tap the groups to study together'}
            </p>
            {selectedDue > 0 && (
              <Button variant="secondary" onClick={() => router.push(studyHref(selected.map((g) => g.id), 'all'))}>
                All
              </Button>
            )}
            <Button
              disabled={selectedCards === 0}
              onClick={() => router.push(studyHref(selected.map((g) => g.id), selectedDue ? 'due' : 'all'))}
            >
              <Play className="h-4 w-4 fill-current" aria-hidden="true" />
              {selectedDue ? 'Study due' : 'Study'}
            </Button>
          </div>
        </div>
      )}

      {creating && (
        <GroupDialog onClose={() => setCreating(false)} onCreated={(id) => router.push(`/flashcards/group?id=${id}`)} />
      )}
    </>
  );
}

function GroupTile({
  group,
  selecting,
  selected,
  onToggle,
}: {
  group: Group;
  selecting: boolean;
  selected: boolean;
  onToggle: () => void;
}) {
  const n = group.cards.length;
  const due = countDue(group.cards);
  const inner = (
    <>
      {/* A small stack of cards in the group's color. */}
      <div className="relative h-14 w-12 shrink-0">
        <span className="absolute inset-0 translate-x-1.5 translate-y-1 rotate-6 rounded-lg opacity-30" style={{ background: group.color }} />
        <span className="absolute inset-0 translate-x-0.5 rotate-2 rounded-lg opacity-55" style={{ background: group.color }} />
        <span
          className="absolute inset-0 grid place-items-center rounded-lg font-display text-lg font-semibold text-white shadow-sm"
          style={{ background: group.color }}
        >
          {group.name.trim().charAt(0).toUpperCase()}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-lg font-semibold leading-snug">{group.name}</p>
        <p className="flex items-center gap-2 text-sm text-ink/55">
          {n ? cardCount(n) : 'No cards yet'}
          {n > 0 && (
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                due ? 'bg-playing-bg text-playing-text' : 'bg-done-bg text-done-text'
              }`}
            >
              {due ? `${due} due` : 'Caught up'}
            </span>
          )}
        </p>
      </div>
    </>
  );

  if (selecting) {
    const disabled = n === 0;
    return (
      <button
        onClick={onToggle}
        disabled={disabled}
        aria-pressed={selected}
        className={`flex w-full items-center gap-4 rounded-2xl border-2 bg-surface p-4 text-left transition disabled:opacity-40 ${
          selected ? 'border-fc shadow-md' : 'border-transparent shadow-sm ring-1 ring-ink/[0.06] hover:ring-ink/15'
        }`}
      >
        {inner}
        <span
          className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 transition ${
            selected ? 'border-fc bg-fc text-white' : 'border-ink/20'
          }`}
        >
          {selected && <Check className="h-4 w-4" aria-hidden="true" />}
        </span>
      </button>
    );
  }

  return (
    <div className="group relative flex items-center gap-4 rounded-2xl border-2 border-transparent bg-surface p-4 shadow-sm ring-1 ring-ink/[0.06] transition hover:-translate-y-0.5 hover:shadow-md">
      <Link href={`/flashcards/group?id=${group.id}`} className="absolute inset-0 rounded-2xl" aria-label={`Open ${group.name}`} />
      {inner}
      {n > 0 && (
        <Link
          href={studyHref([group.id], due ? 'due' : 'all')}
          aria-label={due ? `Study ${due} due in ${group.name}` : `Study ${group.name}`}
          className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full text-white shadow-sm transition hover:scale-105"
          style={{ background: group.color }}
        >
          <Play className="ml-0.5 h-5 w-5 fill-current" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="mx-auto max-w-md py-10 text-center sm:py-16">
      <div className="relative mx-auto mb-8 h-36 w-44">
        <span className="absolute left-2 top-4 h-28 w-36 -rotate-6 rounded-2xl bg-fc/25" />
        <span className="absolute left-5 top-2 h-28 w-36 rotate-3 rounded-2xl bg-fc/50" />
        <span className="absolute left-4 top-3 grid h-28 w-36 place-items-center rounded-2xl bg-surface font-display text-3xl font-semibold text-fc shadow-lg ring-1 ring-ink/5">
          Q?
        </span>
      </div>
      <h2 className="font-display text-3xl font-semibold tracking-tight">Make your first deck</h2>
      <p className="mx-auto mt-3 max-w-sm text-ink/65">
        Start a group for a subject, add cards with their answers, then study them shuffled. Your cards sync across your
        phone, tablet and computer.
      </p>
      <Button size="lg" className="mt-8" onClick={onCreate}>
        <Plus className="h-5 w-5" aria-hidden="true" />
        Create a group
      </Button>
    </div>
  );
}
