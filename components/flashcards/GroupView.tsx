'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { ClipboardPaste, LoaderCircle, Pencil, Play, Plus, Search } from 'lucide-react';
import type { Card } from '@/lib/flashcards/types';
import { useFlashcards } from './FlashcardsShell';
import { studyHref } from './FlashcardsHome';
import Formatted, { plainText } from './Formatted';
import { CardEditor, ConfirmDialog, GroupDialog, ImportDialog } from './dialogs';
import { AccountMenu, Button, PageBody, TopBar, cardCount } from './ui';

type Dialog = { kind: 'edit-group' } | { kind: 'delete-group' } | { kind: 'card'; card?: Card } | { kind: 'import' } | null;

export default function GroupView() {
  const id = useSearchParams().get('id') ?? '';
  const router = useRouter();
  const { groups, store, save } = useFlashcards();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [query, setQuery] = useState('');
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
        {/* Hero: study button in the group's color. */}
        <section
          className="relative overflow-hidden rounded-3xl p-5 text-white shadow-lg sm:p-7"
          style={{ background: `linear-gradient(135deg, ${group.color}, color-mix(in srgb, ${group.color} 70%, #1F1D2B))` }}
        >
          <span className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
          <span className="pointer-events-none absolute -bottom-16 right-16 h-32 w-32 rounded-full bg-white/[0.07]" />
          <div className="relative flex flex-wrap items-end gap-4">
            <div className="mr-auto">
              <p className="text-sm font-medium uppercase tracking-wider text-white/70">Deck</p>
              <p className="font-display text-4xl font-semibold tabular-nums">{cardCount(total)}</p>
            </div>
            <Link
              href={total ? studyHref([group.id]) : '#'}
              aria-disabled={!total}
              onClick={(e) => !total && e.preventDefault()}
              className={`inline-flex h-12 items-center gap-2 rounded-xl bg-white px-6 font-semibold shadow-md transition hover:scale-[1.02] active:scale-[0.98] ${
                total ? '' : 'pointer-events-none opacity-60'
              }`}
              style={{ color: group.color }}
            >
              <Play className="h-4 w-4 fill-current" aria-hidden="true" />
              Study shuffled
            </Link>
          </div>
        </section>

        <div className="mb-4 mt-7 flex flex-wrap items-center gap-2">
          <h2 className="mr-auto text-sm font-semibold uppercase tracking-wider text-ink/45">Cards</h2>
          <Button variant="secondary" onClick={() => setDialog({ kind: 'import' })}>
            <ClipboardPaste className="h-4 w-4" aria-hidden="true" />
            Import
          </Button>
          <Button onClick={() => setDialog({ kind: 'card' })}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add card
          </Button>
        </div>

        {total > 6 && (
          <label className="relative mb-4 block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search cards"
              className="h-11 w-full rounded-xl border border-ink/10 bg-white pl-10 pr-4 outline-none transition placeholder:text-ink/40 focus:border-fc focus:ring-4 focus:ring-fc/15"
            />
          </label>
        )}

        {total === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-ink/10 px-6 py-14 text-center">
            <p className="font-display text-xl font-semibold">No cards yet</p>
            <p className="mx-auto mt-2 max-w-sm text-ink/60">
              Add cards one at a time, or paste a whole list with Import.
            </p>
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
          <ul className="grid gap-3 md:grid-cols-2">
            {cards.map((card) => (
              <li key={card.id}>
                <button
                  onClick={() => setDialog({ kind: 'card', card })}
                  className="flex h-full w-full flex-col rounded-2xl bg-white text-left shadow-sm ring-1 ring-ink/[0.06] transition hover:shadow-md hover:ring-ink/15"
                >
                  <div className="px-4 pb-3 pt-4">
                    <Formatted text={card.front} className="line-clamp-4 font-display text-[1.05rem] font-medium leading-snug" />
                  </div>
                  <div className="mt-auto border-t border-dashed border-ink/10 px-4 pb-4 pt-3 text-sm text-ink/60">
                    <p className="line-clamp-3 whitespace-pre-line">{plainText(card.back)}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </PageBody>

      {dialog?.kind === 'edit-group' && (
        <GroupDialog group={group} onClose={() => setDialog(null)} onDelete={() => setDialog({ kind: 'delete-group' })} />
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
      {dialog?.kind === 'card' && <CardEditor group={group} card={dialog.card} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'import' && <ImportDialog group={group} onClose={() => setDialog(null)} />}
    </>
  );
}
