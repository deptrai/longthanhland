import { PendingListingsTable } from './listings-table';

// /admin/listings page — Story 3.5.
// Admin moderation queue: list PENDING listings + spam flags + approve/reject/bulk-approve.
// Server wrapper → client island PendingListingsTable. Admin protect client-side
// (accessToken in memory — SSR không biết auth state, AD-4 SSR Boundary).
export default function AdminListingsPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 data-testid="moderation-title" className="text-2xl font-bold text-foreground">Hàng đợi duyệt tin</h1>
      <PendingListingsTable />
    </div>
  );
}
