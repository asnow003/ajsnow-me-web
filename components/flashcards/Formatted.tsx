import { Fragment, type ReactNode } from 'react';

// Light formatting for card text, kept to what's easy to type on a phone:
//   **bold**   *italic*   `code`
//   lines starting with "- " or "* " become a bulleted list, "1. " a numbered list
// Line breaks are kept as typed. Everything is rendered as React elements, never as HTML.
type Block =
  | { kind: 'p'; lines: string[] }
  | { kind: 'ul'; items: string[] }
  | { kind: 'ol'; items: string[]; start: number };

const BULLET = /^\s*[-*•]\s+(.*)$/;
const NUMBER = /^\s*(\d+)[.)]\s+(.*)$/;

function toBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  for (const line of text.replace(/\r\n?/g, '\n').split('\n')) {
    const last = blocks[blocks.length - 1];
    const bullet = BULLET.exec(line);
    const number = bullet ? null : NUMBER.exec(line);
    if (!line.trim()) {
      blocks.push({ kind: 'p', lines: [] });
    } else if (bullet) {
      if (last?.kind === 'ul') last.items.push(bullet[1]);
      else blocks.push({ kind: 'ul', items: [bullet[1]] });
    } else if (number) {
      if (last?.kind === 'ol') last.items.push(number[2]);
      else blocks.push({ kind: 'ol', items: [number[2]], start: Number(number[1]) });
    } else if (last?.kind === 'p' && last.lines.length) {
      last.lines.push(line);
    } else {
      blocks.push({ kind: 'p', lines: [line] });
    }
  }
  return blocks.filter((b) => b.kind !== 'p' || b.lines.length);
}

const INLINE = /(\*\*[^*\n]+\*\*|`[^`\n]+`|\*[^*\s][^*\n]*\*)/g;

function inline(text: string): ReactNode[] {
  return text.split(INLINE).map((part, i) => {
    if (i % 2 === 0) return part;
    if (part.startsWith('**')) return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
    if (part.startsWith('`'))
      return (
        <code key={i} className="rounded bg-ink/[0.06] px-1.5 py-0.5 font-mono text-[0.9em]">
          {part.slice(1, -1)}
        </code>
      );
    return <em key={i}>{part.slice(1, -1)}</em>;
  });
}

export default function Formatted({ text, className = '' }: { text: string; className?: string }) {
  const blocks = toBlocks(text);
  return (
    <div className={`space-y-[0.6em] break-words ${className}`}>
      {blocks.map((block, i) => {
        if (block.kind === 'p')
          return (
            <p key={i}>
              {block.lines.map((line, j) => (
                <Fragment key={j}>
                  {j > 0 && <br />}
                  {inline(line)}
                </Fragment>
              ))}
            </p>
          );
        const items = block.items.map((item, j) => (
          <li key={j} className="pl-1">
            {inline(item)}
          </li>
        ));
        return block.kind === 'ul' ? (
          <ul key={i} className="list-disc space-y-1 pl-[1.3em] text-left marker:text-ink/35">
            {items}
          </ul>
        ) : (
          <ol key={i} start={block.start} className="list-decimal space-y-1 pl-[1.5em] text-left marker:text-ink/45">
            {items}
          </ol>
        );
      })}
    </div>
  );
}

// The same text with formatting marks removed, for one-line previews.
export function plainText(text: string): string {
  return text
    .replace(/\*\*([^*\n]+)\*\*/g, '$1')
    .replace(/`([^`\n]+)`/g, '$1')
    .replace(/\*([^*\s][^*\n]*)\*/g, '$1')
    .replace(/^\s*(?:[-*•]|\d+[.)])\s+/gm, '');
}
