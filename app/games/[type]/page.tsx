import { GAMES } from '@/lib/games/registry';
import GameHistory from './GameHistory';

export const dynamicParams = false;

export function generateStaticParams() {
  return GAMES.map((g) => ({ type: g.id }));
}

export default function Page({ params }: { params: { type: string } }) {
  return <GameHistory type={params.type} />;
}
