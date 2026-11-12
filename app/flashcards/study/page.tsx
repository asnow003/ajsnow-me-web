import { Suspense } from 'react';
import StudyView from '@/components/flashcards/StudyView';

// The groups to study are in the query string (?g=id1,id2) because the site is static.
export default function Page() {
  return (
    <Suspense>
      <StudyView />
    </Suspense>
  );
}
