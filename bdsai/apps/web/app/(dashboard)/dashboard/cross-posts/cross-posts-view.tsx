'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/auth/use-auth';
import { useAuthFetch } from '@/lib/auth-fetch';

// Story 5.6: Seller cross-posts dashboard.
// Lists all listings + their cross-posts. Promote, confirm assisted, remove.

interface MyListing {
  id: string;
  title: string;
  status: string;
  price: number;
}

interface CrossPost {
  id: string;
  listingId: string;
  platform: string;
  externalUrl: string | null;
  providerJobId: string | null;
  status: string;
  errorMessage: string | null;
  createdAt: string;
}

interface ListingWithCrossPosts {
  listing: MyListing;
  crossPosts: CrossPost[];
}

const PLATFORM_LABEL: Record<string, string> = {
  facebook: 'Facebook',
  cho_tot: 'Chợ Tốt',
  zalo: 'Zalo',
};

const PLATFORM_COLOR: Record<string, string> = {
  facebook: 'bg-blue-100 text-blue-700',
  cho_tot: 'bg-orange-100 text-orange-700',
  zalo: 'bg-sky-100 text-sky-700',
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Đang xử lý',
  posted: 'Đã đăng',
  assisted: 'Chờ xác nhận',
  failed: 'Lỗi',
  removed: 'Đã gỡ',
  removal_failed: 'Gỡ lỗi',
};

const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  posted: 'bg-green-100 text-green-700',
  assisted: 'bg-blue-100 text-blue-700',
  failed: 'bg-red-100 text-red-700',
  removed: 'bg-gray-100 text-gray-700',
  removal_failed: 'bg-orange-100 text-orange-700',
};

const ALL_PLATFORMS = ['facebook', 'cho_tot', 'zalo'] as const;

export function CrossPostsView() {
  const { isAuthenticated, isLoading } = useAuth();
  const { authFetch } = useAuthFetch();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = useState<ListingWithCrossPosts[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [promoteListingId, setPromoteListingId] = useState<string | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(new Set());
  const [promoteError, setPromoteError] = useState<string | null>(null);
  const [confirmPost, setConfirmPost] = useState<CrossPost | null>(null);
  const [confirmUrl, setConfirmUrl] = useState('');
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const listingsRes = await authFetch('/api/marketplace/my-listings');
      const listingsBody = (await listingsRes.json()) as MyListing[] & { message?: string };
      if (!listingsRes.ok) {
        setError(listingsBody.message ?? 'Tải danh sách tin thất bại');
        return;
      }
      const listings = Array.isArray(listingsBody) ? listingsBody : [];

      // Fetch cross-posts for each listing in parallel.
      const crossPostResults = await Promise.all(
        listings.map(async (listing) => {
          try {
            const cpRes = await authFetch(`/api/xaction/cross-posts?listingId=${listing.id}`);
            const cpBody = (await cpRes.json()) as CrossPost[] & { message?: string };
            if (!cpRes.ok) return { listing, crossPosts: [] };
            return { listing, crossPosts: Array.isArray(cpBody) ? cpBody : [] };
          } catch {
            return { listing, crossPosts: [] };
          }
        }),
      );
      setData(crossPostResults);

      // Auto-open promote dialog if ?promote=listingId in URL.
      const promoteId = searchParams.get('promote');
      if (promoteId && listings.some((l) => l.id === promoteId)) {
        setPromoteListingId(promoteId);
        setSelectedPlatforms(new Set());
        setPromoteError(null);
      }
    } catch {
      setError('Lỗi mạng, thử lại sau');
    } finally {
      setLoading(false);
    }
  }, [authFetch, searchParams]);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace('/login?redirect=/dashboard/cross-posts');
      return;
    }
    void reload();
  }, [isAuthenticated, isLoading, router, reload]);

  async function handlePromote() {
    if (!promoteListingId || selectedPlatforms.size === 0) return;
    setActionLoading('promote');
    setPromoteError(null);
    try {
      const res = await authFetch('/api/xaction/cross-posts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          listingId: promoteListingId,
          platforms: Array.from(selectedPlatforms),
        }),
      });
      const body = (await res.json()) as { message?: string; enqueued?: number; errors?: Array<{ platform: string; message: string }> };
      if (!res.ok) {
        setPromoteError(body.message ?? 'Quảng bá thất bại');
        return;
      }
      setPromoteListingId(null);
      setSelectedPlatforms(new Set());
      await reload();
    } catch {
      setPromoteError('Lỗi mạng, thử lại sau');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleConfirmAssisted() {
    if (!confirmPost || !confirmUrl) return;
    setActionLoading(`confirm-${confirmPost.id}`);
    setConfirmError(null);
    try {
      const res = await authFetch(`/api/xaction/cross-posts/${confirmPost.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'posted', externalUrl: confirmUrl }),
      });
      const body = (await res.json()) as { message?: string };
      if (!res.ok) {
        setConfirmError(body.message ?? 'Xác nhận thất bại');
        return;
      }
      setConfirmPost(null);
      setConfirmUrl('');
      await reload();
    } catch {
      setConfirmError('Lỗi mạng, thử lại sau');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRemove(id: string) {
    if (!confirm('Gỡ cross-post này?')) return;
    setActionLoading(`remove-${id}`);
    setError(null);
    try {
      const res = await authFetch(`/api/xaction/cross-posts/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = (await res.json()) as { message?: string };
        setError(body.message ?? 'Gỡ cross-post thất bại');
        return;
      }
      await reload();
    } catch {
      setError('Lỗi mạng, thử lại sau');
    } finally {
      setActionLoading(null);
    }
  }

  function togglePlatform(platform: string) {
    setSelectedPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(platform)) next.delete(platform);
      else next.add(platform);
      return next;
    });
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
          Vui lòng <a href="/login?redirect=/dashboard/cross-posts" className="underline">đăng nhập</a> để xem.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl py-8">
      <h1 className="mb-6 text-2xl font-bold">Quảng bá đa kênh</h1>

      {error && (
        <div role="alert" className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {data.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Bạn chưa có tin nào.{' '}
          <Link href="/dashboard/dang-tin" className="underline">Đăng tin ngay</Link>.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {data.map(({ listing, crossPosts }) => (
            <div key={listing.id} className="rounded-md border border-border p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <Link href={`/listings/${listing.id}`} className="font-semibold hover:underline">
                    {listing.title}
                  </Link>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {Number(listing.price).toLocaleString('vi-VN')} đ
                  </p>
                </div>
                {listing.status === 'PUBLISHED' && (
                  <button
                    type="button"
                    onClick={() => {
                      setPromoteListingId(listing.id);
                      setSelectedPlatforms(new Set());
                      setPromoteError(null);
                    }}
                    className="shrink-0 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                  >
                    + Quảng bá
                  </button>
                )}
              </div>

              {crossPosts.length > 0 && (
                <div className="mt-3 flex flex-col gap-2">
                  {crossPosts.map((cp) => (
                    <div key={cp.id} className="flex items-center gap-3 rounded-md bg-muted/30 p-2 text-sm">
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${PLATFORM_COLOR[cp.platform] ?? 'bg-gray-100 text-gray-700'}`}>
                        {PLATFORM_LABEL[cp.platform] ?? cp.platform}
                      </span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[cp.status] ?? 'bg-gray-100 text-gray-700'}`}>
                        {STATUS_LABEL[cp.status] ?? cp.status}
                      </span>
                      {cp.externalUrl && cp.status === 'posted' && (
                        <a
                          href={cp.externalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="truncate text-xs text-blue-600 hover:underline"
                        >
                          Xem bài đăng ↗
                        </a>
                      )}
                      {cp.externalUrl && cp.status === 'assisted' && (
                        <a
                          href={cp.externalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="truncate text-xs text-blue-600 hover:underline"
                        >
                          Mở link đăng tin ↗
                        </a>
                      )}
                      {cp.errorMessage && (
                        <span className="truncate text-xs text-red-600">{cp.errorMessage}</span>
                      )}
                      <div className="ml-auto flex gap-2">
                        {cp.status === 'assisted' && (
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmPost(cp);
                              setConfirmUrl('');
                              setConfirmError(null);
                            }}
                            disabled={actionLoading === `confirm-${cp.id}`}
                            className="rounded-md bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                          >
                            {actionLoading === `confirm-${cp.id}` ? 'Đang xử lý...' : 'Xác nhận đã đăng'}
                          </button>
                        )}
                        {(cp.status === 'pending' || cp.status === 'posted' || cp.status === 'assisted') && (
                          <button
                            type="button"
                            onClick={() => void handleRemove(cp.id)}
                            disabled={actionLoading === `remove-${cp.id}`}
                            className="rounded-md border border-input bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                          >
                            {actionLoading === `remove-${cp.id}` ? 'Đang gỡ...' : 'Gỡ'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Promote dialog */}
      {promoteListingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setPromoteListingId(null)}>
          <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-lg font-bold">Quảng bá tin</h2>
            <p className="mb-4 text-sm text-muted-foreground">Chọn nền tảng để đăng tin:</p>
            <div className="mb-4 flex flex-col gap-2">
              {ALL_PLATFORMS.map((platform) => (
                <label key={platform} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedPlatforms.has(platform)}
                    onChange={() => togglePlatform(platform)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PLATFORM_COLOR[platform] ?? 'bg-gray-100 text-gray-700'}`}>
                    {PLATFORM_LABEL[platform] ?? platform}
                  </span>
                </label>
              ))}
            </div>
            {promoteError && (
              <p className="mb-3 text-sm text-red-600">{promoteError}</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPromoteListingId(null)}
                className="rounded-md border border-input bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => void handlePromote()}
                disabled={selectedPlatforms.size === 0 || actionLoading === 'promote'}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {actionLoading === 'promote' ? 'Đang xử lý...' : 'Quảng bá'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm assisted dialog */}
      {confirmPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setConfirmPost(null)}>
          <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-lg font-bold">Xác nhận đã đăng</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Dán link bài đăng {PLATFORM_LABEL[confirmPost.platform] ?? confirmPost.platform} của bạn:
            </p>
            <input
              type="url"
              value={confirmUrl}
              onChange={(e) => setConfirmUrl(e.target.value)}
              placeholder="https://..."
              className="mb-3 w-full rounded-md border border-input px-3 py-2 text-sm"
            />
            {confirmError && (
              <p className="mb-3 text-sm text-red-600">{confirmError}</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmPost(null)}
                className="rounded-md border border-input bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmAssisted()}
                disabled={!confirmUrl || actionLoading === `confirm-${confirmPost.id}`}
                className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {actionLoading === `confirm-${confirmPost.id}` ? 'Đang xử lý...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
