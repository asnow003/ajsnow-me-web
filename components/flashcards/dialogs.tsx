'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Copy, FolderInput, Play, Plus, Trash2 } from 'lucide-react';
import { parseCards } from '@/lib/flashcards/importer';
import { mostMissed } from '@/lib/flashcards/review';
import { GROUP_COLORS, MAX_CARDS_PER_GROUP, MAX_GROUP_NAME, MAX_SIDE_LENGTH, type Card, type Group } from '@/lib/flashcards/types';
import { studyHref } from '@/lib/flashcards/study';
import { useFlashcards } from './FlashcardsShell';
import Formatted from './Formatted';
import { AutoTextarea, Button, ColorPicker, Sheet, cardCount } from './ui';

const newId = () => crypto.randomUUID();

// Create a group, or rename and recolor one.
export function GroupDialog({
  group,
  onClose,
  onCreated,
  onDelete,
  onDuplicated,
}: {
  group?: Group;
  onClose: () => void;
  onCreated?: (id: string) => void;
  onDelete?: () => void;
  onDuplicated?: (id: string) => void;
}) {
  const { store, save, groups, toast } = useFlashcards();
  const [name, setName] = useState(group?.name ?? '');
  // New groups take the next color in the palette, so a fresh list isn't all one color.
  const [color, setColor] = useState(group?.color ?? GROUP_COLORS[(groups?.length ?? 0) % GROUP_COLORS.length]);
  const [busy, setBusy] = useState(false);
  const trimmed = name.trim();

  const submit = async () => {
    if (!trimmed || busy) return;
    setBusy(true);
    if (group) {
      if (await save(() => store.updateGroup(group.id, { name: trimmed, color }))) onClose();
    } else {
      let id = '';
      if (await save(async () => (id = await store.createGroup(trimmed, color)))) onCreated?.(id);
    }
    setBusy(false);
  };

  // A copy of the group with fresh cards: same questions and answers, study progress starting over.
  const duplicate = async () => {
    if (!group || busy) return;
    setBusy(true);
    const now = Date.now();
    const cards = group.cards.map((c, i) => ({ id: newId(), front: c.front, back: c.back, createdAt: now + i }));
    const name = `${group.name} (copy)`.slice(0, MAX_GROUP_NAME);
    let id = '';
    if (await save(async () => (id = await store.createGroup(name, group.color, cards)))) {
      toast(`Made a copy of ${group.name}`);
      onDuplicated?.(id);
    }
    setBusy(false);
  };

  return (
    <Sheet
      title={group ? 'Edit group' : 'New group'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} className="ml-auto">
            Cancel
          </Button>
          <Button onClick={submit} disabled={!trimmed || busy}>
            {group ? 'Save' : 'Create group'}
          </Button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="space-y-5 pt-2"
      >
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink/70">Name</span>
          <input
            autoFocus
            value={name}
            maxLength={MAX_GROUP_NAME}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Spanish verbs, State capitals"
            className="h-12 w-full rounded-xl border bg-surface border-ink/15 px-4 text-lg outline-none transition placeholder:text-ink/35 focus:border-fc focus:ring-4 focus:ring-fc/15"
          />
        </label>
        <div>
          <span className="mb-2 block text-sm font-medium text-ink/70">Color</span>
          <ColorPicker value={color} onChange={setColor} />
        </div>
        {group && (
          <div className="flex flex-wrap gap-2 border-t border-ink/[0.08] pt-4">
            {onDuplicated && (
              <Button type="button" variant="secondary" onClick={duplicate} disabled={busy}>
                <Copy className="h-4 w-4" aria-hidden="true" />
                Duplicate group
              </Button>
            )}
            {onDelete && (
              <Button type="button" variant="ghost" onClick={onDelete} className="text-danger hover:bg-danger/10 hover:text-danger">
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Delete group
              </Button>
            )}
          </div>
        )}
      </form>
    </Sheet>
  );
}

export function ConfirmDialog({
  title,
  message,
  confirm,
  onConfirm,
  onClose,
}: {
  title: string;
  message: React.ReactNode;
  confirm: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} className="ml-auto">
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            {confirm}
          </Button>
        </>
      }
    >
      <p className="pt-1 text-ink/75">{message}</p>
    </Sheet>
  );
}

const FORMAT_HINT = (
  <p className="text-xs leading-relaxed text-ink/50">
    <code className="rounded bg-ink/5 px-1">**bold**</code> <code className="rounded bg-ink/5 px-1">*italic*</code>{' '}
    <code className="rounded bg-ink/5 px-1">`code`</code> · start a line with <code className="rounded bg-ink/5 px-1">-</code> for a
    bullet or <code className="rounded bg-ink/5 px-1">1.</code> for a numbered list
  </p>
);

// Add or edit one card. New cards can be saved and followed by another without closing.
export function CardEditor({ group, card, onClose }: { group: Group; card?: Card; onClose: () => void }) {
  const { store, save, toast } = useFlashcards();
  const [front, setFront] = useState(card?.front ?? '');
  const [back, setBack] = useState(card?.back ?? '');
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(0);
  const frontRef = useRef<HTMLTextAreaElement>(null);
  const ready = front.trim().length > 0 && back.trim().length > 0;

  const submit = async (another: boolean) => {
    if (!ready || busy) return;
    setBusy(true);
    const f = front.trim();
    const b = back.trim();
    const ok = await save(() =>
      store.changeCards(group.id, (cards) => {
        if (card) return cards.map((c) => (c.id === card.id ? { ...c, front: f, back: b } : c));
        if (cards.length >= MAX_CARDS_PER_GROUP) throw new Error(`This group is full (${MAX_CARDS_PER_GROUP} cards).`);
        return [...cards, { id: newId(), front: f, back: b, createdAt: Date.now() }];
      }),
    );
    setBusy(false);
    if (!ok) return;
    if (another) {
      setFront('');
      setBack('');
      setPreview(false);
      setAdded((n) => n + 1);
      frontRef.current?.focus();
    } else {
      if (!card && added) toast(`Added ${cardCount(added + 1)}`);
      onClose();
    }
  };

  const remove = async () => {
    if (!card) return;
    if (await save(() => store.changeCards(group.id, (cards) => cards.filter((c) => c.id !== card.id)))) onClose();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      submit(!card);
    }
  };

  return (
    <Sheet
      title={card ? 'Edit card' : added ? `New card · ${added} added` : 'New card'}
      onClose={onClose}
      wide
      footer={
        <>
          {card && (
            <Button variant="ghost" onClick={remove} className="text-danger hover:bg-danger/10 hover:text-danger">
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Delete</span>
            </Button>
          )}
          <Button variant="ghost" onClick={() => setPreview((p) => !p)} className="mr-auto px-3">
            {preview ? 'Edit' : 'Preview'}
          </Button>
          {!card && (
            <Button variant="secondary" onClick={() => submit(true)} disabled={!ready || busy}>
              <span className="sm:hidden">Add another</span>
              <span className="hidden sm:inline">Save &amp; add another</span>
            </Button>
          )}
          <Button onClick={() => submit(false)} disabled={!ready || busy}>
            Save
          </Button>
        </>
      }
    >
      {preview ? (
        <div className="grid gap-3 pt-2 sm:grid-cols-2">
          {[
            ['Question', front],
            ['Answer', back],
          ].map(([label, text]) => (
            <div key={label} className="rounded-2xl border border-ink/10 bg-cream/60 p-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink/40">{label}</p>
              {text.trim() ? <Formatted text={text} className="font-display text-lg" /> : <p className="text-ink/35">Empty</p>}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4 pt-2" onKeyDown={onKeyDown}>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink/70">Question</span>
            <AutoTextarea
              ref={frontRef}
              autoFocus
              minRows={2}
              value={front}
              maxLength={MAX_SIDE_LENGTH}
              onChange={(e) => setFront(e.target.value)}
              placeholder="What's on the front of the card"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink/70">Answer</span>
            <AutoTextarea
              minRows={4}
              value={back}
              maxLength={MAX_SIDE_LENGTH}
              onChange={(e) => setBack(e.target.value)}
              placeholder={'The answer. It can be several lines:\n- like this\n- and this'}
            />
          </label>
          {FORMAT_HINT}
        </div>
      )}
    </Sheet>
  );
}

const IMPORT_EXAMPLE = `What is the capital of France?
Paris

Name the primary colors
- Red
- Yellow
- Blue`;

// Paste many cards at once.
export function ImportDialog({ group, onClose }: { group: Group; onClose: () => void }) {
  const { store, save, toast } = useFlashcards();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const parsed = useMemo(() => parseCards(text), [text]);
  const room = MAX_CARDS_PER_GROUP - group.cards.length;
  const count = Math.min(parsed.cards.length, room);

  const submit = async () => {
    if (!count || busy) return;
    setBusy(true);
    const now = Date.now();
    const incoming = parsed.cards.slice(0, count).map((c, i) => ({ id: newId(), ...c, createdAt: now + i }));
    const ok = await save(() => store.changeCards(group.id, (cards) => [...cards, ...incoming].slice(0, MAX_CARDS_PER_GROUP)));
    setBusy(false);
    if (ok) {
      toast(`Added ${cardCount(count)} to ${group.name}`);
      onClose();
    }
  };

  return (
    <Sheet
      title="Import cards"
      onClose={onClose}
      wide
      footer={
        <>
          <p className="mr-auto text-sm text-ink/60">
            {parsed.cards.length ? `${cardCount(parsed.cards.length)} found` : 'Nothing to import yet'}
            {parsed.skipped > 0 && ` · ${parsed.skipped} without an answer skipped`}
            {parsed.cards.length > room && ` · only ${room} fit`}
          </p>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!count || busy}>
            Add {count ? cardCount(count) : 'cards'}
          </Button>
        </>
      }
    >
      <div className="space-y-4 pt-2">
        <div className="rounded-2xl bg-fc-pale/70 p-4 text-sm leading-relaxed text-fc-deep">
          <p>
            <strong className="font-semibold">One card per block</strong>, with a blank line between cards. The first line is
            the question; the lines under it are the answer.
          </p>
          <p className="mt-1.5 text-fc-deep/75">
            Need blank lines inside an answer? Put a line with <code className="rounded bg-surface/70 px-1">---</code> between
            cards instead. Pasting from a spreadsheet with question and answer columns works too.
          </p>
        </div>
        <AutoTextarea
          autoFocus
          minRows={8}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={IMPORT_EXAMPLE}
          className="font-mono text-sm"
        />
        {parsed.cards.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink/40">Preview</p>
            <ul className="space-y-2">
              {parsed.cards.slice(0, 3).map((c, i) => (
                <li key={i} className="grid gap-2 rounded-xl border border-ink/10 p-3 text-sm sm:grid-cols-2 sm:gap-4">
                  <Formatted text={c.front} className="font-medium" />
                  <Formatted text={c.back} className="text-ink/70" />
                </li>
              ))}
            </ul>
            {parsed.cards.length > 3 && <p className="mt-2 text-sm text-ink/50">and {parsed.cards.length - 3} more</p>}
          </div>
        )}
      </div>
    </Sheet>
  );
}

// Pick the group to move or copy the selected cards into, or name a new one.
export function TransferDialog({
  from,
  cardIds,
  mode,
  onClose,
  onDone,
}: {
  from: Group;
  cardIds: string[];
  mode: 'move' | 'copy';
  onClose: () => void;
  onDone: () => void;
}) {
  const { groups, store, save, toast } = useFlashcards();
  const [busy, setBusy] = useState(false);
  // The name for a new group, once "New group" is tapped.
  const [newName, setNewName] = useState<string | null>(null);
  const targets = (groups ?? []).filter((g) => g.id !== from.id);
  const verb = mode === 'move' ? 'Move' : 'Copy';

  const send = async (to: Group | null) => {
    if (busy) return;
    setBusy(true);
    const name = to?.name ?? (newName ?? '').trim();
    if (!name) return setBusy(false);
    const ok = await save(async () => {
      let toId = to?.id;
      if (!toId) {
        const used = new Set((groups ?? []).map((g) => g.color));
        toId = await store.createGroup(name, GROUP_COLORS.find((c) => !used.has(c)) ?? from.color);
      }
      await store.transferCards(from.id, toId, cardIds, mode);
    });
    setBusy(false);
    if (ok) {
      toast(`${mode === 'move' ? 'Moved' : 'Copied'} ${cardCount(cardIds.length)} to ${name}`);
      onDone();
    }
  };

  return (
    <Sheet title={`${verb} ${cardCount(cardIds.length)} to…`} onClose={onClose}>
      <ul className="space-y-2 pb-2 pt-1">
        {targets.map((g) => {
          const full = g.cards.length + cardIds.length > MAX_CARDS_PER_GROUP;
          return (
            <li key={g.id}>
              <button
                onClick={() => send(g)}
                disabled={busy || full}
                className="flex w-full items-center gap-3 rounded-2xl p-3 text-left ring-1 ring-ink/[0.08] transition hover:bg-ink/[0.03] hover:ring-ink/20 disabled:opacity-40"
              >
                <span
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl font-display font-semibold text-white"
                  style={{ background: g.color }}
                >
                  {g.name.trim().charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{g.name}</span>
                  <span className="block text-sm text-ink/55">{full ? 'Too full' : cardCount(g.cards.length)}</span>
                </span>
                <FolderInput className="h-4 w-4 shrink-0 text-ink/35" aria-hidden="true" />
              </button>
            </li>
          );
        })}
        <li>
          {newName === null ? (
            <button
              onClick={() => setNewName('')}
              disabled={busy}
              className="flex w-full items-center gap-3 rounded-2xl border-2 border-dashed border-ink/15 p-3 text-left text-ink/70 transition hover:border-ink/30 hover:text-ink disabled:opacity-40"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ink/[0.05]">
                <Plus className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="font-medium">New group</span>
            </button>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(null);
              }}
              className="flex gap-2 rounded-2xl border-2 border-dashed border-ink/15 p-2"
            >
              <input
                autoFocus
                value={newName}
                maxLength={MAX_GROUP_NAME}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="New group name"
                className="h-11 min-w-0 flex-1 rounded-xl border border-ink/15 bg-surface px-3 outline-none focus:border-fc focus:ring-4 focus:ring-fc/15"
              />
              <Button type="submit" disabled={!newName.trim() || busy}>
                {verb}
              </Button>
            </form>
          )}
        </li>
      </ul>
    </Sheet>
  );
}

// The cards you miss most, worst first, with a way to practice just those.
export function MostMissedDialog({
  group,
  onClose,
  onOpenCard,
}: {
  group: Group;
  onClose: () => void;
  onOpenCard: (card: Card) => void;
}) {
  const cards = mostMissed(group.cards);
  const worst = cards[0]?.review?.lapses ?? 1;
  return (
    <Sheet
      title="Most missed"
      onClose={onClose}
      wide
      footer={
        <Link
          href={studyHref([group.id], 'missed')}
          className="ml-auto inline-flex h-11 items-center gap-2 rounded-xl bg-fc px-4 font-medium text-white shadow-sm transition hover:bg-fc-dark active:scale-[0.98]"
        >
          <Play className="h-4 w-4 fill-current" aria-hidden="true" />
          Practice these {cards.length}
        </Link>
      }
    >
      <p className="pb-3 text-sm text-ink/55">Counted from the first answer to each card in every session.</p>
      <ol className="space-y-2 pb-2">
        {cards.map((c, i) => {
          const { lapses, reps } = c.review!;
          return (
            <li key={c.id}>
              <button
                onClick={() => onOpenCard(c)}
                className="flex w-full items-start gap-3 rounded-2xl p-3 text-left ring-1 ring-ink/[0.08] transition hover:bg-ink/[0.03] hover:ring-ink/20"
              >
                <span className="mt-0.5 w-6 shrink-0 text-right text-sm font-semibold tabular-nums text-ink/35">{i + 1}</span>
                <span className="grid min-w-0 flex-1 gap-1 sm:grid-cols-2 sm:gap-4">
                  <Formatted text={c.front} className="line-clamp-2 font-display font-medium" />
                  <Formatted text={c.back} className="line-clamp-2 text-sm text-ink/60" />
                </span>
                <span className="w-24 shrink-0 text-right">
                  <span className="block text-sm font-semibold text-[#E11D48]">
                    missed {lapses} of {reps}
                  </span>
                  <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-ink/[0.08]">
                    <span className="block h-full rounded-full bg-[#E11D48]/70" style={{ width: `${(lapses / worst) * 100}%` }} />
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </Sheet>
  );
}
