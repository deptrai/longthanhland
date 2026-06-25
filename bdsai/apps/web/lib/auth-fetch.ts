'use client';

import { useCallback } from 'react';
import { useAuth } from '@/components/auth/use-auth';

/**
 * useAuthFetch (AC8d) — Story 2.2.
 *
 * Fetch wrapper với JWT refresh interceptor:
 *   - Mỗi request thêm Authorization: Bearer <accessToken>.
 *   - Nếu response 401 (token expired) → auto gọi /api/auth/refresh
 *     (im lặng, dùng httpOnly cookie) → get new accessToken → retry.
 *   - Nếu refresh cũng fail (401) → clear auth context + redirect /login.
 *
 * KHÔNG thêm dep — dùng fetch native (React hook pattern).
 */
export function useAuthFetch() {
  const { accessToken, logout, setAccessToken } = useAuth();

  const authFetch = useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response> => {
      const headers = new Headers(options.headers);
      if (accessToken) {
        headers.set('Authorization', `Bearer ${accessToken}`);
      }

      let res = await fetch(url, { ...options, headers, credentials: 'include' });

      // 401 → auto refresh im lặng (AC8d).
      if (res.status === 401) {
        const refreshRes = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
        });
        if (refreshRes.ok) {
          const data = (await refreshRes.json()) as { accessToken?: string };
          if (data.accessToken) {
            setAccessToken(data.accessToken);
            // Retry original request với new access token.
            headers.set('Authorization', `Bearer ${data.accessToken}`);
            res = await fetch(url, { ...options, headers, credentials: 'include' });
          } else {
            logout();
          }
        } else {
          // Refresh fail → clear auth + redirect /login.
          logout();
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }
      }
      return res;
    },
    [accessToken, logout, setAccessToken],
  );

  return { authFetch };
}
