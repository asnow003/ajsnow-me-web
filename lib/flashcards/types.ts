// A flashcard. Both sides are plain text with light formatting (see components/flashcards/Formatted.tsx).
export interface Card {
  id: string;
  front: string;
  back: string;
  createdAt: number;
  // Spaced-repetition schedule (lib/flashcards/review.ts). Missing on cards that haven't been studied yet.
  review?: Review;
}

export interface Review {
  // Leitner box: 0 is "still learning", higher boxes wait longer between reviews.
  box: number;
  // When the card is next due, in ms since the epoch.
  due: number;
  // Times answered, and times missed.
  reps: number;
  lapses: number;
  last: number;
}

// A group of cards. Cards live inside their group's document, so a whole group loads, saves and imports in
// one read or write. A Firestore document holds 1 MB, which is a few thousand typical cards.
export interface Group {
  id: string;
  name: string;
  color: string;
  cards: Card[];
  createdAt: number;
  updatedAt: number;
}

export type NewGroup = Omit<Group, 'id'>;

export const MAX_GROUP_NAME = 60;
export const MAX_SIDE_LENGTH = 4000;
export const MAX_CARDS_PER_GROUP = 2000;

// Group colors: each reads well as white text on the color and as a tint on cream.
export const GROUP_COLORS = [
  '#0F766E', // teal
  '#2563EB', // blue
  '#7C3AED', // violet
  '#C026D3', // magenta
  '#E11D48', // rose
  '#EA580C', // orange
  '#B45309', // amber
  '#15803D', // green
  '#475569', // slate
] as const;
