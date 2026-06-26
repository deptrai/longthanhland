'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/use-auth';
import { useAuthFetch } from '@/lib/auth-fetch';

// PendingListingsTable — Story 3.5.
// Admin moderation queue: list PENDING listings + spam flags + approve/reject/bulk-approve.
// Auth protect: !isAuthenticated && !isLoading → redirect /login?redirect=/admin/listings.
// user.role !== 'admin' && !== 'super-admin' → redirect / (E11).
// super-admin có toàn quyền admin (Story 2.5).
// AD-10: submit qua Next API thin proxy.

interface PendingItem {
  id: string;
  title: string;
  listingType: string;
  price: number;
  area: string;
  propertyType: string;
  province: string;
  district: string;
  sellerId: string;
  status: string;
  createdAt: string;
  spamFlagged: boolean;
  spamReasons: string[];
}

interface PendingResponse {
  items: PendingItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const PAGE_SIZE = 20;

export function PendingListingsTable() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { authFetch } = useAuthFetch();
  const router = useRouter();

  const [items, setItems] = useState<PendingItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loadingData, setLoadingData] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [rejectTarget, setRejectTarget] = useState<PendingItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectReasons, setRejectReasons] = useState<string[]>([]);

  // Auth protect.
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace('/login?redirect=/admin/listings');
      return;
    }
    if (user && user.role !== 'admin' && user.role !== 'super-admin') {
      router.replace('/');
    }
  }, [isLoading, isAuthenticated, user, router]);

  // Load pending listings.
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    async function fetchData() {
      setLoadingData(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(PAGE_SIZE),
        });
        const res = await authFetch(`/api/marketplace/admin/pending?${params.toString()}`);
        const body = (await res.json()) as PendingResponse & {
          statusCode?: number;
          message?: string;
        };
        if (cancelled) return;
        if (!res.ok) {
          setError(body.message ?? 'Tải danh sách thất bại');
          return;
        }
        setItems(body.items);
        setTotal(body.total);
        setSelectedIds(new Set());
      } catch {
        if (!cancelled) setError('Lỗi mạng, thử lại sau');
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    }
    void fetchData();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, page, authFetch]);

  // Load reject reason templates (once).
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    async function fetchReasons() {
      try {
        const res = await authFetch('/api/marketplace/admin/reject-reasons');
        const body = (await res.json()) as { reasons?: string[] };
        if (cancelled) return;
        if (res.ok && body.reasons) setRejectReasons(body.reasons);
      } catch {
        // Non-blocking — reject still works với custom reason.
      }
    }
    void fetchReasons();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, authFetch]);

  async function handleApprove(item: PendingItem) {
    setActionLoadingId(item.id);
    setError(null);
    setSuccess(null);
    try {
      const res = await authFetch(`/api/marketplace/listings/${item.id}/approve`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ spamFlagged: item.spamFlagged }),
      });
      const body = (await res.json()) as { message?: string };
      if (!res.ok) {
        setError(body.message ?? 'Duyệt tin thất bại');
        return;
      }
      setSuccess('Đã duyệt tin');
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
      setTotal((t) => Math.max(0, t - 1));
    } catch {
      setError('Lỗi mạng, thử lại sau');
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleReject(target: PendingItem, reason: string) {
    if (reason.trim().length < 3) return;
    setActionLoadingId(target.id);
    setError(null);
    setSuccess(null);
    try {
      const res = await authFetch(`/api/marketplace/listings/${target.id}/reject`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reason, spamFlagged: target.spamFlagged }),
      });
      const body = (await res.json()) as { message?: string };
      if (!res.ok) {
        setError(body.message ?? 'Từ chối tin thất bại');
        return;
      }
      setSuccess('Đã từ chối tin');
      setItems((prev) => prev.filter((i) => i.id !== target.id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(target.id);
        return next;
      });
      setTotal((t) => Math.max(0, t - 1));
      setRejectTarget(null);
      setRejectReason('');
    } catch {
      setError('Lỗi mạng, thử lại sau');
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleBulkApprove() {
    if (selectedIds.size === 0) return;
    setActionLoadingId('bulk');
    setError(null);
    setSuccess(null);
    try {
      const res = await authFetch('/api/marketplace/admin/bulk-approve', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ listingIds: Array.from(selectedIds) }),
      });
      const body = (await res.json()) as {
        approved?: string[];
        failed?: Array<{ id: string; error: string }>;
      };
      if (!res.ok) {
        setError('Duyệt hàng loạt thất bại');
        return;
      }
      const approvedCount = body.approved?.length ?? 0;
      const failedCount = body.failed?.length ?? 0;
      setSuccess(
        `Đã duyệt ${approvedCount} tin${failedCount > 0 ? `, ${failedCount} thất bại` : ''}`,
      );
      const approvedSet = new Set(body.approved ?? []);
      setItems((prev) => prev.filter((i) => !approvedSet.has(i.id)));
      setSelectedIds(new Set());
      setTotal((t) => Math.max(0, t - approvedCount));
    } catch {
      setError('Lỗi mạng, thử lại sau');
    } finally {
      setActionLoadingId(null);
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)));
    }
  }

  if (isLoading || loadingData) {
    return (
      <div className="flex items-center justify-center py-12" aria-busy="true">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="ml-3 text-sm text-muted-foreground">Đang tải...</span>
      </div>
    );
  }

  if (!isAuthenticated || (user && user.role !== 'admin' && user.role !== 'super-admin')) {
    return null;
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const startIdx = (page - 1) * PAGE_SIZE;
  const endIdx = Math.min(startIdx + items.length, total);
  const allSelected = items.length > 0 && selectedIds.size === items.length;

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}
      {success && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-md border border-green-500/50 bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-400"
        >
          {success}
        </div>
      )}

      {/* Bulk actions */}
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {total > 0
            ? `Hiển thị ${startIdx + 1}–${endIdx} trên ${total} tin chờ duyệt`
            : 'Không có tin chờ duyệt'}
        </p>
        {selectedIds.size > 0 && (
          <button
            type="button"
            onClick={() => void handleBulkApprove()}
            disabled={actionLoadingId === 'bulk'}
            className="min-h-[44px] rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {actionLoadingId === 'bulk'
              ? 'Đang duyệt...'
              : `Duyệt ${selectedIds.size} tin đã chọn`}
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  aria-label="Chọn tất cả"
                  className="h-4 w-4"
                />
              </th>
              <th scope="col" className="px-3 py-2 font-medium">Tiêu đề</th>
              <th scope="col" className="px-3 py-2 font-medium">Giá</th>
              <th scope="col" className="px-3 py-2 font-medium">Diện tích</th>
              <th scope="col" className="px-3 py-2 font-medium">Khu vực</th>
              <th scope="col" className="px-3 py-2 font-medium">Spam</th>
              <th scope="col" className="px-3 py-2 font-medium">Ngày tạo</th>
              <th scope="col" className="px-3 py-2 font-medium">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                  Không có tin chờ duyệt.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-t border-border">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(item.id)}
                      onChange={() => toggleSelect(item.id)}
                      aria-label={`Chọn ${item.title}`}
                      className="h-4 w-4"
                    />
                  </td>
                  <td className="px-3 py-2 font-medium">{item.title}</td>
                  <td className="px-3 py-2">
                    {Number(item.price).toLocaleString('vi-VN')} VND
                  </td>
                  <td className="px-3 py-2">{item.area} m²</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {item.district}, {item.province}
                  </td>
                  <td className="px-3 py-2">
                    {item.spamFlagged ? (
                      <span
                        className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-700 dark:text-red-400"
                        title={item.spamReasons.join(', ')}
                      >
                        Nghi spam
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void handleApprove(item)}
                        disabled={actionLoadingId === item.id}
                        aria-label={`Duyệt ${item.title}`}
                        className="min-h-[44px] rounded-md border border-green-500/50 px-3 py-1 text-sm font-medium text-green-700 transition-colors hover:bg-green-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:text-green-400"
                      >
                        {actionLoadingId === item.id ? '...' : 'Duyệt'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRejectReason('');
                          setRejectTarget(item);
                        }}
                        disabled={actionLoadingId === item.id}
                        aria-label={`Từ chối ${item.title}`}
                        className="min-h-[44px] rounded-md border border-red-500/50 px-3 py-1 text-sm font-medium text-red-700 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400"
                      >
                        Từ chối
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {selectedIds.size > 0 && `Đã chọn ${selectedIds.size} tin`}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="min-h-[44px] rounded-md border border-input bg-background px-3 py-1 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            ‹ Trang trước
          </button>
          <span className="text-sm text-muted-foreground">
            Trang {page}/{totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="min-h-[44px] rounded-md border border-input bg-background px-3 py-1 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            Trang sau ›
          </button>
        </div>
      </div>

      {/* Reject dialog */}
      {rejectTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-reject-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-lg">
            <h2 id="confirm-reject-title" className="text-lg font-semibold text-foreground">
              Từ chối tin
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Từ chối tin &quot;{rejectTarget.title}&quot;? Seller sẽ nhận thông báo kèm lý do.
            </p>
            {rejectReasons.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {rejectReasons.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRejectReason(r)}
                    className="rounded-full border border-input bg-background px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent"
                  >
                    {r}
                  </button>
                ))}
              </div>
            )}
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Lý do từ chối (tối thiểu 3 ký tự)"
              maxLength={500}
              rows={3}
              className="mt-3 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setRejectTarget(null);
                  setRejectReason('');
                }}
                className="min-h-[44px] rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => void handleReject(rejectTarget, rejectReason)}
                disabled={rejectReason.trim().length < 3}
                className="min-h-[44px] rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Từ chối
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
