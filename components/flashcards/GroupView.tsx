'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Check, CheckSquare, ClipboardPaste, Crosshair, Copy, FolderInput, LoaderCircle, Pencil, Play, Plus, Search, Trash2, X } from 'lucide-react';
import { cardStatus, countDue, mostMissed, nextDueAt, whenLabel } from '@/lib/flashcards/review';
import type { Card } from '@/lib/flashcards/types';
import { studyHref } from '@/lib/flashcards/study';
import { useFlashcards } from './FlashcardsShell';
import Formatted, { plainText } from './Formatted';
import { CardEditor, ConfirmDialog, GroupDialog, ImportDialog, MostMissedDialog, TransferDialog } from './dialogs';
import { AccountMenu, Button, PageBody, TopBar, cardCount } from './ui';

type Dialog =
  | { kind: 'edit-group' }
  | { kind: 'delete-group' }
  | { kind: 'card'; card?: Card }
  | { kind: 'import' }
  | { kind: 'transfer'; mode: 'move' | 'copy' }
  | { kind: 'delete-cards' }
  | { kind: 'missed' }
  | null;

export default function GroupView() {
  const id = useSearchParams().get('id') ?? '';
  const router = useRouter();
  const { groups, store, save, toast } = useFlashcards();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [query, setQuery] = useState('');
  // Selected card ids while in select mode, or null when not selecting.
  const [selected, setSelected] = useState<Set<string> | null>(null);
  const group = groups?.find((g) => g.id === id);

  const cards = useMemo(() => {
    const list = [...(group?.cards ?? [])].sort((a, b) => b.createdAt - a.createdAt);
    const q = query.trim().toLowerCase();
    return q ? list.filter((c) => `${c.front}\n${c.back}`.toLowerCase().includes(q)) : list;
  }, [group, query]);

  if (groups === null) {
    return (
      <div className="grid min-h-svh place-items-center text-fc">
        <LoaderCircle className="h-9 w-9 animate-spin" aria-label="Loading" />
      </div>
    );
  }

  if (!group) {
    return (
      <>
        <TopBar back="/flashcards" title={<h1 className="font-display text-xl font-semibold">Not found</h1>} />
        <PageBody>
          <p className="py-16 text-center text-ink/60">
            This group doesn&apos;t exist anymore.{' '}
            <Link href="/flashcards" className="font-medium text-fc underline">
              Back to your groups
            </Link>
          </p>
        </PageBody>
      </>
    );
  }

  const total = group.cards.length;
  const due = countDue(group.cards);
  const nextDue = nextDueAt(group.cards);
  const missedCount = mostMissed(group.cards).length;
  const picked = selected ? group.cards.filter((c) => selected.has(c.id)).map((c) => c.id) : [];

  const toggle = (cardId: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  const allShown = cards.length > 0 && cards.every((c) => selected?.has(c.id));

  return (
    <>
      <TopBar
        back="/flashcards"
        title={
          <button
            onClick={() => setDialog({ kind: 'edit-group' })}
            className="group -ml-1 flex max-w-full items-center gap-2.5 rounded-xl px-1 py-1 text-left hover:bg-ink/5"
          >
            <span className="h-3.5 w-3.5 shrink-0 rounded-full" style={{ background: group.color }} />
            <h1 className="truncate font-display text-xl font-semibold tracking-tight sm:text-2xl">{group.name}</h1>
            <Pencil className="h-4 w-4 shrink-0 text-ink/30 group-hover:text-ink/60" aria-label="Edit group" />
          </button>
        }
        right={<AccountMenu />}
      />
      <PageBody>
        {/* Hero: what's due and the study buttons, in the group's color. */}
        <section
          className="relative overflow-hidden rounded-3xl p-5 text-white shadow-lg sm:p-7"
          style={{ background: `linear-gradient(135deg, ${group.color}, color-mix(in srgb, ${group.color} 70%, #1F1D2B))` }}
        >
          <span className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
          <span className="pointer-events-none absolute -bottom-16 right-16 h-32 w-32 rounded-full bg-white/[0.07]" />
          <div className="relative flex flex-wrap items-end gap-4">
            <div className="mr-auto">
              <p className="text-sm font-medium uppercase tracking-wider text-white/70">{cardCount(total)}</p>
              <p className="font-display text-4xl font-semibold tabular-nums">
                {total === 0 ? 'Empty' : due > 0 ? `${due} due` : 'All caught up'}
              </p>
              {total > 0 && due === 0 && nextDue && (
                <p className="mt-1 text-sm text-white/75">Next review {whenLabel(nextDue)}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {due > 0 && (
                <Link
                  href={studyHref([group.id], 'due')}
                  className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-5 font-semibold shadow-md transition hover:scale-[1.02] active:scale-[0.98]"
                  style={{ color: group.color }}
                >
                  <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                  Study {due} due
                </Link>
              )}
              {total > 0 && (
                <Link
                  href={studyHref([group.id], 'all')}
                  className={
                    due > 0
                      ? 'inline-flex h-12 items-center gap-2 rounded-xl bg-white/15 px-5 font-semibold text-white ring-1 ring-white/30 transition hover:bg-white/25 active:scale-[0.98]'
                      : 'inline-flex h-12 items-center gap-2 rounded-xl bg-white px-5 font-semibold shadow-md transition hover:scale-[1.02] active:scale-[0.98]'
                  }
                  style={due > 0 ? undefined : { color: group.color }}
                >
                  {due === 0 && <Play className="h-4 w-4 fill-current" aria-hidden="true" />}
                  {due > 0 ? 'All' : 'Study all'}
                </Link>
              )}
            </div>
          </div>
        </section>

        <div className="mb-4 mt-7 flex flex-wrap items-center gap-2">
          {selected ? (
            <>
              <h2 className="mr-auto text-sm font-semibold uppercase tracking-wider text-ink/45">
                {picked.length ? `${picked.length} selected` : 'Select cards'}
              </h2>
              <Button
                variant="ghost"
                className="px-3"
                onClick={() => setSelected(allShown ? new Set() : new Set(cards.map((c) => c.id)))}
              >
                {allShown ? 'None' : 'All'}
              </Button>
              <Button variant="secondary" onClick={() => setSelected(null)}>
                <X className="h-4 w-4" aria-hidden="true" />
                Done
              </Button>
            </>
          ) : (
            <>
              <h2 className="mr-auto text-sm font-semibold uppercase tracking-wider text-ink/45">Cards</h2>
              {missedCount > 0 && (
                <Button variant="ghost" onClick={() => setDialog({ kind: 'missed' })} className="px-3">
                  <Crosshair className="h-4 w-4" aria-hidden="true" />
                  Most missed
                </Button>
              )}
              {total > 0 && (
                <Button variant="ghost" onClick={() => setSelected(new Set())} className="px-3">
                  <CheckSquare className="h-4 w-4" aria-hidden="true" />
                  Select
                </Button>
              )}
              <Button variant="secondary" onClick={() => setDialog({ kind: 'import' })}>
                <ClipboardPaste className="h-4 w-4" aria-hidden="true" />
                Import
              </Button>
              <Button onClick={() => setDialog({ kind: 'card' })}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add card
              </Button>
            </>
          )}
        </div>

        {total > 6 && (
          <label className="relative mb-4 block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search cards"
              className="h-11 w-full rounded-xl border border-ink/10 bg-surface pl-10 pr-4 outline-none transition placeholder:text-ink/40 focus:border-fc focus:ring-4 focus:ring-fc/15"
            />
          </label>
        )}

        {total === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-ink/10 px-6 py-14 text-center">
            <p className="font-display text-xl font-semibold">No cards yet</p>
            <p className="mx-auto mt-2 max-w-sm text-ink/60">Add cards one at a time, or paste a whole list with Import.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Button onClick={() => setDialog({ kind: 'card' })}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add a card
              </Button>
              <Button variant="secondary" onClick={() => setDialog({ kind: 'import' })}>
                <ClipboardPaste className="h-4 w-4" aria-hidden="true" />
                Import a list
              </Button>
            </div>
          </div>
        ) : cards.length === 0 ? (
          <p className="py-10 text-center text-ink/55">No cards match “{query.trim()}”.</p>
        ) : (
          <ul className={`grid gap-3 md:grid-cols-2 ${selected ? 'pb-20' : ''}`}>
            {cards.map((card) => {
              const isSelected = Boolean(selected?.has(card.id));
              return (
                <li key={card.id}>
                  <button
                    onClick={() => (selected ? toggle(card.id) : setDialog({ kind: 'card', card }))}
                    aria-pressed={selected ? isSelected : undefined}
                    className={`relative flex h-full w-full flex-col rounded-2xl bg-surface text-left shadow-sm transition hover:shadow-md ${
                      isSelected ? 'ring-2 ring-fc' : 'ring-1 ring-ink/[0.06] hover:ring-ink/15'
                    }`}
                  >
                    {selected && (
                      <span
                        className={`absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full border-2 transition ${
                          isSelected ? 'border-fc bg-fc text-white' : 'border-ink/20 bg-surface'
                        }`}
                      >
                        {isSelected && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                      </span>
                    )}
                    <div className={`px-4 pb-3 pt-4 ${selected ? 'pr-12' : ''}`}>
                      <Formatted text={card.front} className="line-clamp-4 font-display text-[1.05rem] font-medium leading-snug" />
                    </div>
                    <div className="mt-auto flex items-end gap-3 border-t border-dashed border-ink/10 px-4 pb-4 pt-3 text-sm text-ink/60">
                      <p className="line-clamp-3 min-w-0 flex-1 whitespace-pre-line">{plainText(card.back)}</p>
                      <StatusChip card={card} />
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </PageBody>

      {selected && (
        <div className="fixed inset-x-0 bottom-0 z-30 animate-sheet-in border-t border-ink/10 bg-surface/95 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 sm:px-6">
            <Button
              variant="ghost"
              disabled={!picked.length}
              onClick={() => setDialog({ kind: 'delete-cards' })}
              className="mr-auto px-3 text-danger hover:bg-danger/10 hover:text-danger"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Delete</span>
            </Button>
            <Button variant="secondary" disabled={!picked.length} onClick={() => setDialog({ kind: 'transfer', mode: 'copy' })}>
              <Copy className="h-4 w-4" aria-hidden="true" />
              Copy to…
            </Button>
            <Button disabled={!picked.length} onClick={() => setDialog({ kind: 'transfer', mode: 'move' })}>
              <FolderInput className="h-4 w-4" aria-hidden="true" />
              Move to…
            </Button>
          </div>
        </div>
      )}

      {dialog?.kind === 'edit-group' && (
        <GroupDialog
          group={group}
          onClose={() => setDialog(null)}
          onDelete={() => setDialog({ kind: 'delete-group' })}
          onDuplicated={(newId) => {
            setDialog(null);
            router.push(`/flashcards/group?id=${newId}`);
          }}
        />
      )}
      {dialog?.kind === 'delete-group' && (
        <ConfirmDialog
          title="Delete group?"
          message={
            <>
              <strong className="font-semibold text-ink">{group.name}</strong> and its {cardCount(total)} will be deleted.
              This can&apos;t be undone.
            </>
          }
          confirm="Delete"
          onClose={() => setDialog(null)}
          onConfirm={() => {
            // Leave first, so the page doesn't flash "not found" when the group disappears.
            router.replace('/flashcards');
            save(() => store.deleteGroup(group.id));
          }}
        />
      )}
      {dialog?.kind === 'delete-cards' && (
        <ConfirmDialog
          title={`Delete ${cardCount(picked.length)}?`}
          message="They'll be removed from this group. This can't be undone."
          confirm="Delete"
          onClose={() => setDialog(null)}
          onConfirm={async () => {
            const ids = new Set(picked);
            if (await save(() => store.changeCards(group.id, (list) => list.filter((c) => !ids.has(c.id))))) {
              toast(`Deleted ${cardCount(ids.size)}`);
              setSelected(null);
            }
            setDialog(null);
          }}
        />
      )}
      {dialog?.kind === 'transfer' && (
        <TransferDialog
          from={group}
          cardIds={picked}
          mode={dialog.mode}
          onClose={() => setDialog(null)}
          onDone={() => {
            setDialog(null);
            setSelected(null);
          }}
        />
      )}
      {dialog?.kind === 'missed' && (
        <MostMissedDialog
          group={group}
          onClose={() => setDialog(null)}
          onOpenCard={(card) => setDialog({ kind: 'card', card })}
        />
      )}
      {dialog?.kind === 'card' && <CardEditor group={group} card={dialog.card} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'import' && <ImportDialog group={group} onClose={() => setDialog(null)} />}
    </>
  );
}

function StatusChip({ card }: { card: Card }) {
  const status = cardStatus(card);
  if (status.kind === 'new')
    return <span className="shrink-0 rounded-full bg-fc-pale px-2 py-0.5 text-[11px] font-semibold text-fc-deep">New</span>;
  if (status.kind === 'due')
    return (
      <span className="shrink-0 rounded-full bg-playing-bg px-2 py-0.5 text-[11px] font-semibold text-playing-text">Due</span>
    );
  return (
    <span className="shrink-0 whitespace-nowrap text-[11px] font-medium text-ink/40" title={`Box ${status.box}`}>
      {status.label}
    </span>
  );
}
