'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/auth/use-auth';
import { useAuthFetch } from '@/lib/auth-fetch';

// Story 3.6: Seller dashboard — danh sách tin của tôi + renew/sold actions.
// GET /api/marketplace/my-listings → NestJS (JWT required).
// POST /api/marketplace/listings/[id]/renew + /sold.

interface MyListing {
  id: string;
  title: string;
  status: string;
  price: number;
  createdAt: string;
  expiresAt: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Bản nháp',
  PENDING: 'Chờ duyệt',
  PUBLISHED: 'Đang hiển thị',
  REJECTED: 'Bị từ chối',
  EXPIRED: 'Hết hạn',
  SOLD: 'Đã bán',
};

const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
  PUBLISHED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  EXPIRED: 'bg-orange-100 text-orange-700',
  SOLD: 'bg-blue-100 text-blue-700',
};

export default function MyListingsPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const { authFetch } = useAuthFetch();
  const router = useRouter();

  const [listings, setListings] = useState<MyListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch('/api/marketplace/my-listings');
      const body = (await res.json()) as MyListing[] & { message?: string };
      if (!res.ok) {
        setError(body.message ?? 'Tải danh sách thất bại');
        return;
      }
      setListings(Array.isArray(body) ? body : []);
    } catch {
      setError('Lỗi mạng, thử lại sau');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace('/login?redirect=/dashboard/my-listings');
      return;
    }
    let cancelled = false;
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const res = await authFetch('/api/marketplace/my-listings');
        const body = (await res.json()) as MyListing[] & { message?: string };
        if (cancelled) return;
        if (!res.ok) {
          setError(body.message ?? 'Tải danh sách thất bại');
          return;
        }
        setListings(Array.isArray(body) ? body : []);
      } catch {
        if (!cancelled) setError('Lỗi mạng, thử lại sau');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void fetchData();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isLoading, router]);

  async function handleAction(id: string, action: 'renew' | 'sold') {
    setActionLoading(`${id}-${action}`);
    try {
      const res = await authFetch(`/api/marketplace/listings/${id}/${action}`, { method: 'POST' });
      if (!res.ok) {
        const body = (await res.json()) as { message?: string };
        setError(body.message ?? `Thao tác ${action} thất bại`);
        return;
      }
      await reload();
    } catch {
      setError('Lỗi mạng, thử lại sau');
    } finally {
      setActionLoading(null);
    }
  }

  if (isLoading || loading) {
    return (
      <div className="mx-auto max-w-4xl py-8">
        <p className="text-center text-sm text-muted-foreground">Đang tải...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-4xl py-8">
        <p className="text-center text-sm text-muted-foreground">
          Vui lòng <a href="/login?redirect=/dashboard/my-listings" className="underline">đăng nhập</a> để xem tin.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tin của tôi</h1>
        <Link
          href="/dashboard/dang-tin"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Đăng tin mới
        </Link>
      </div>
      {error && (
        <div
          role="alert"
          className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}
      {listings.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">
          Bạn chưa có tin nào. <Link href="/dashboard/dang-tin" className="underline">Đăng tin ngay</Link>.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {listings.map((listing) => (
            <div key={listing.id} className="rounded-md border border-border p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <Link href={`/listings/${listing.id}`} className="font-semibold hover:underline">
                    {listing.title}
                  </Link>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {Number(listing.price).toLocaleString('vi-VN')} đ
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Đăng: {new Date(listing.createdAt).toLocaleDateString('vi-VN')}
                    {listing.expiresAt && ` · Hết hạn: ${new Date(listing.expiresAt).toLocaleDateString('vi-VN')}`}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${STATUS_COLOR[listing.status] ?? 'bg-gray-100 text-gray-700'}`}
                >
                  {STATUS_LABEL[listing.status] ?? listing.status}
                </span>
              </div>
              <div className="mt-3 flex gap-2">
                <Link
                  href={`/dashboard/dang-tin?edit=${listing.id}`}
                  className="rounded-md border border-input bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Sửa
                </Link>
                {listing.status === 'EXPIRED' && (
                  <button
                    type="button"
                    onClick={() => void handleAction(listing.id, 'renew')}
                    disabled={actionLoading === `${listing.id}-renew`}
                    className="rounded-md bg-orange-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-700 disabled:opacity-50"
                  >
                    {actionLoading === `${listing.id}-renew` ? 'Đang gia hạn...' : 'Gia hạn'}
                  </button>
                )}
                {listing.status === 'PUBLISHED' && (
                  <button
                    type="button"
                    onClick={() => void handleAction(listing.id, 'sold')}
                    disabled={actionLoading === `${listing.id}-sold`}
                    className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {actionLoading === `${listing.id}-sold` ? 'Đang cập nhật...' : 'Đánh dấu đã bán'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
