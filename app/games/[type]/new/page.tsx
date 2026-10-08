import { GAMES } from '@/lib/games/registry';
import NewGame from './NewGame';

export const dynamicParams = false;

export function generateStaticParams() {
  return GAMES.map((g) => ({ type: g.id }));
}

export default function Page({ params }: { params: { type: string } }) {
  return <NewGame type={params.type} />;
}
