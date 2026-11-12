import { Suspense } from 'react';
import GroupView from '@/components/flashcards/GroupView';

// The group id is in the query string (?id=…) because the site is static and groups are created at runtime.
export default function Page() {
  return (
    <Suspense>
      <GroupView />
    </Suspense>
  );
}
