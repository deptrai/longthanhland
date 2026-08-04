import { Suspense } from 'react';
import { CrossPostsView } from './cross-posts-view';

// Story 5.6: Cross-posts page (server wrapper).
// Suspense boundary required cho useSearchParams() (Next.js CSR bailout).
export default function CrossPostsPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-4xl py-8 text-center text-sm text-muted-foreground">Đang tải...</div>}>
      <CrossPostsView />
    </Suspense>
  );
}
