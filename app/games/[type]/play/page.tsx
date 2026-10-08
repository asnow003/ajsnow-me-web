import { Suspense } from 'react';
import { Loading } from '@/components/games/ui';
import { GAMES } from '@/lib/games/registry';
import PlayGame from './PlayGame';

export const dynamicParams = false;

export function generateStaticParams() {
  return GAMES.map((g) => ({ type: g.id }));
}

// The game id is in the query string (?id=…) because the site is static and games are created at runtime.
export default function Page({ params }: { params: { type: string } }) {
  return (
    <Suspense fallback={<Loading />}>
      <PlayGame type={params.type} />
    </Suspense>
  );
}
