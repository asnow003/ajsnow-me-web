// Bold player colors, each dark enough for white text.
export const PLAYER_COLORS = [
  '#534AB7', '#1D9E75', '#D85A30', '#D4537E', '#378ADD', '#BA7517',
  '#639922', '#993556', '#0F6E56', '#7F77DD', '#E24B4A', '#185FA5',
];

export function nextPlayerColor(existingCount: number): string {
  return PLAYER_COLORS[existingCount % PLAYER_COLORS.length];
}
