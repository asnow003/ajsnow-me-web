// Turns pasted text into cards. Three layouts are understood:
//
// 1. Blocks separated by blank lines. The first line is the question, the lines under it are the answer.
// 2. Blocks separated by a line of "---". Same as 1, but answers may contain blank lines.
// 3. One card per line with a tab between question and answer (pasted from a spreadsheet or exported list).
export interface ParsedCards {
  cards: { front: string; back: string }[];
  // Blocks that had a question but no answer.
  skipped: number;
}

const SEPARATOR = /^\s*-{3,}\s*$/;

export function parseCards(text: string): ParsedCards {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const cards: ParsedCards['cards'] = [];
  let skipped = 0;

  const addBlock = (block: string[]) => {
    const trimmed = trimBlankEdges(block);
    if (!trimmed.length) return;
    const front = trimmed[0].trim();
    const back = trimBlankEdges(trimmed.slice(1)).join('\n').trim();
    if (front && back) cards.push({ front, back });
    else skipped++;
  };

  if (lines.some((l) => SEPARATOR.test(l))) {
    let block: string[] = [];
    for (const line of lines) {
      if (SEPARATOR.test(line)) {
        addBlock(block);
        block = [];
      } else block.push(line);
    }
    addBlock(block);
    return { cards, skipped };
  }

  const filled = lines.filter((l) => l.trim());
  if (filled.length && filled.every((l) => l.includes('\t'))) {
    for (const line of filled) {
      const tab = line.indexOf('\t');
      const front = line.slice(0, tab).trim();
      // Spreadsheet cells keep line breaks as literal "\n" in some exports.
      const back = line.slice(tab + 1).trim().replace(/\\n/g, '\n');
      if (front && back) cards.push({ front, back });
      else skipped++;
    }
    return { cards, skipped };
  }

  let block: string[] = [];
  for (const line of lines) {
    if (line.trim()) block.push(line);
    else {
      addBlock(block);
      block = [];
    }
  }
  addBlock(block);
  return { cards, skipped };
}

function trimBlankEdges(lines: string[]): string[] {
  let start = 0;
  let end = lines.length;
  while (start < end && !lines[start].trim()) start++;
  while (end > start && !lines[end - 1].trim()) end--;
  return lines.slice(start, end);
}
