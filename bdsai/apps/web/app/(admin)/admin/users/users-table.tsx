'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/use-auth';
import { useAuthFetch } from '@/lib/auth-fetch';

// UsersTable (AC6, AC7) — Story 2.4.
// Client component: table list + search + pagination + ban/unban button.
// Auth protect: !isAuthenticated && !isLoading → redirect /login?redirect=/admin/users.
// user.role !== 'admin' → redirect / (E11 — user thường không thấy admin page).
// AD-10: submit qua Next API thin proxy (/api/admin/users, /api/admin/users/:id/ban).

interface AdminUserItem {
  id: string;
  email: string;
  phone: string;
  role: string;
  banned: boolean;
  createdAt: string;
}

interface ListUsersResponse {
  data: AdminUserItem[];
  total: number;
  page: number;
  limit: number;
}

const PAGE_SIZE = 20;

export function UsersTable() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { authFetch } = useAuthFetch();
  const router = useRouter();

  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loadingData, setLoadingData] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<AdminUserItem | null>(null);

  // AC6b/E10: auth protect — redirect /login nếu chưa login.
  // E11: user thường → redirect /.
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace('/login?redirect=/admin/users');
      return;
    }
    if (user && user.role !== 'admin') {
      router.replace('/');
    }
  }, [isLoading, isAuthenticated, user, router]);

  // Load users khi page/search/auth thay đổi. Inline async (tránh
  // react-hooks/set-state-in-effect — setState sau await, KHÔNG sync trong effect).
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
        if (search) params.set('search', search);
        const res = await authFetch(`/api/admin/users?${params.toString()}`);
        const body = (await res.json()) as ListUsersResponse & {
          statusCode?: number;
          message?: string;
        };
        if (cancelled) return;
        if (!res.ok) {
          setError(body.message ?? 'Tải danh sách thất bại');
          return;
        }
        setUsers(body.data);
        setTotal(body.total);
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
  }, [isAuthenticated, page, search, authFetch]);

  // AC6f: ban/unban action.
  async function handleBan(target: AdminUserItem) {
    setConfirmTarget(null);
    setActionLoadingId(target.id);
    setError(null);
    setSuccess(null);
    try {
      const res = await authFetch(`/api/admin/users/${target.id}/ban`, {
        method: 'POST',
      });
      const body = (await res.json()) as { message?: string; banned?: boolean };
      if (!res.ok) {
        setError(body.message ?? 'Khóa tài khoản thất bại');
        return;
      }
      setSuccess('Đã khóa tài khoản');
      // Update row locally (avoid full reload).
      setUsers((prev) =>
        prev.map((u) => (u.id === target.id ? { ...u, banned: true } : u)),
      );
    } catch {
      setError('Lỗi mạng, thử lại sau');
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleUnban(target: AdminUserItem) {
    setActionLoadingId(target.id);
    setError(null);
    setSuccess(null);
    try {
      const res = await authFetch(`/api/admin/users/${target.id}/unban`, {
        method: 'POST',
      });
      const body = (await res.json()) as { message?: string; banned?: boolean };
      if (!res.ok) {
        setError(body.message ?? 'Mở khóa tài khoản thất bại');
        return;
      }
      setSuccess('Đã mở khóa tài khoản');
      setUsers((prev) =>
        prev.map((u) => (u.id === target.id ? { ...u, banned: false } : u)),
      );
    } catch {
      setError('Lỗi mạng, thử lại sau');
    } finally {
      setActionLoadingId(null);
    }
  }

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  // Loading state (tránh flash — AC6b).
  if (isLoading || loadingData) {
    return (
      <div className="flex items-center justify-center py-12" aria-busy="true">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="ml-3 text-sm text-muted-foreground">Đang tải...</span>
      </div>
    );
  }

  if (!isAuthenticated || (user && user.role !== 'admin')) {
    // Redirect đã trigger trong useEffect — render null tránh flash.
    return null;
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const startIdx = (page - 1) * PAGE_SIZE;
  const endIdx = Math.min(startIdx + users.length, total);

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

      {/* Search bar (AC6d) */}
      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Tìm theo email hoặc SĐT"
          aria-label="Tìm kiếm người dùng"
          maxLength={100}
          className="min-h-[44px] flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          className="min-h-[44px] rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring"
        >
          Tìm
        </button>
        {search && (
          <button
            type="button"
            onClick={() => {
              setSearchInput('');
              setSearch('');
              setPage(1);
            }}
            className="min-h-[44px] rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Xóa lọc
          </button>
        )}
      </form>

      {/* Table (AC6c) */}
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium">STT</th>
              <th scope="col" className="px-3 py-2 font-medium">Email</th>
              <th scope="col" className="px-3 py-2 font-medium">SĐT</th>
              <th scope="col" className="px-3 py-2 font-medium">Vai trò</th>
              <th scope="col" className="px-3 py-2 font-medium">Trạng thái</th>
              <th scope="col" className="px-3 py-2 font-medium">Ngày tạo</th>
              <th scope="col" className="px-3 py-2 font-medium">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                  Không có người dùng nào.
                </td>
              </tr>
            ) : (
              users.map((item, index) => (
                <tr key={item.id} className="border-t border-border">
                  <td className="px-3 py-2 text-muted-foreground">
                    {startIdx + index + 1}
                  </td>
                  <td className="px-3 py-2">{item.email}</td>
                  <td className="px-3 py-2">{item.phone}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        item.role === 'admin'
                          ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {item.role === 'admin' ? 'Admin' : 'User'}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        item.banned
                          ? 'bg-red-500/10 text-red-700 dark:text-red-400'
                          : 'bg-green-500/10 text-green-700 dark:text-green-400'
                      }`}
                    >
                      {item.banned ? 'Đã khóa' : 'Hoạt động'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="px-3 py-2">
                    {item.banned ? (
                      <button
                        type="button"
                        onClick={() => void handleUnban(item)}
                        disabled={actionLoadingId === item.id}
                        aria-label={`Mở khóa ${item.email}`}
                        className="min-h-[44px] rounded-md border border-green-500/50 px-3 py-1 text-sm font-medium text-green-700 transition-colors hover:bg-green-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:text-green-400"
                      >
                        {actionLoadingId === item.id ? '...' : 'Mở khóa'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmTarget(item)}
                        disabled={actionLoadingId === item.id}
                        aria-label={`Khóa ${item.email}`}
                        className="min-h-[44px] rounded-md border border-red-500/50 px-3 py-1 text-sm font-medium text-red-700 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400"
                      >
                        {actionLoadingId === item.id ? '...' : 'Khóa'}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination (AC6e) */}
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {total > 0
            ? `Hiển thị ${startIdx + 1}–${endIdx} trên ${total}`
            : 'Không có kết quả'}
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

      {/* Confirm dialog (AC6f) */}
      {confirmTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-ban-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-lg">
            <h2 id="confirm-ban-title" className="text-lg font-semibold text-foreground">
              Xác nhận khóa tài khoản
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Bạn chắc chắn khóa tài khoản {confirmTarget.email}? Người dùng sẽ
              không thể đăng nhập.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmTarget(null)}
                className="min-h-[44px] rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => void handleBan(confirmTarget)}
                className="min-h-[44px] rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
              >
                Khóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
