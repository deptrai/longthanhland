'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth/use-auth';
import { useAuthFetch } from '@/lib/auth-fetch';

// InquiryBadge — Story 6.2.
// Hiển thị số inquiry chưa đọc trên dashboard sidebar.
// Poll nhẹ 60s — không cần WebSocket cho MVP.

export function InquiryBadge() {
  const { isAuthenticated } = useAuth();
  const { authFetch } = useAuthFetch();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;

    async function fetchCount() {
      try {
        const res = await authFetch('/api/inquiries');
        if (!cancelled && res.ok) {
          const body = (await res.json()) as unknown[];
          if (Array.isArray(body)) {
            setCount(body.length);
          }
        }
      } catch {
        // Silent — badge không quan trọng enough để show error.
      }
    }

    void fetchCount();
    // Poll mỗi 60s — nhẹ, không spam API.
    const interval = setInterval(fetchCount, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isAuthenticated, authFetch]);

  if (!isAuthenticated || count === 0) return null;

  return (
    <span
      className="ml-auto inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-bold text-destructive-foreground"
      aria-label={`${count} tin nhắn liên hệ`}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}
