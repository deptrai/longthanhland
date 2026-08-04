'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/use-auth';
import { useAuthFetch } from '@/lib/auth-fetch';

// Story 6.2: Seller dashboard — danh sách inquiry nhận được.
// GET /api/inquiries/list → NestJS (JWT required).

interface InquiryItem {
  id: string;
  listingId: string;
  listingTitle: string;
  buyerName: string;
  buyerPhone: string;
  buyerEmail: string | null;
  message: string;
  createdAt: string;
}

export default function DashboardInquiriesPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const { authFetch } = useAuthFetch();
  const router = useRouter();

  const [inquiries, setInquiries] = useState<InquiryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace('/login?redirect=/dashboard/inquiries');
      return;
    }
    let cancelled = false;
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const res = await authFetch('/api/inquiries');
        const body = (await res.json()) as InquiryItem[] & { message?: string };
        if (cancelled) return;
        if (!res.ok) {
          setError(body.message ?? 'Tải danh sách thất bại');
          return;
        }
        setInquiries(Array.isArray(body) ? body : []);
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
  }, [isAuthenticated, isLoading, authFetch, router]);

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
          Vui lòng <a href="/login?redirect=/dashboard/inquiries" className="underline">đăng nhập</a> để xem tin nhắn.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl py-8">
      <h1 className="mb-6 text-2xl font-bold">Tin nhắn liên hệ</h1>
      {error && (
        <div
          role="alert"
          className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}
      {inquiries.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">
          Chưa có tin nhắn liên hệ nào.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {inquiries.map((inq) => (
            <div key={inq.id} className="rounded-md border border-border p-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">
                  <a href={`/listings/${inq.listingId}`} className="hover:underline">
                    {inq.listingTitle}
                  </a>
                </h2>
                <span className="text-xs text-muted-foreground">
                  {new Date(inq.createdAt).toLocaleDateString('vi-VN')}
                </span>
              </div>
              <p className="mt-2 text-sm">
                <span className="font-medium">{inq.buyerName}</span> — {inq.buyerPhone}
                {inq.buyerEmail && ` · ${inq.buyerEmail}`}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{inq.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
