import { Suspense } from 'react';
import { Loading } from '@/components/games/ui';
import PlayerDetail from './PlayerDetail';

// The player id is in the query string (?id=…) because the site is static and players are created at runtime.
export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <PlayerDetail />
    </Suspense>
  );
}
