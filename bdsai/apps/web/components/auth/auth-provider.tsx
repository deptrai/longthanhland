'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { AuthContext, type AuthUser, type AuthContextValue } from './auth-context';

/**
 * AuthProvider (AC8) — Story 2.2.
 *
 * Client component — wrap app trong root layout.
 * accessToken trong memory (useState) — KHÔNG localStorage (XSS).
 *
 * Restore session on mount: gọi /api/auth/refresh (httpOnly cookie tự gửi)
 * → get new accessToken + user profile (qua /api/auth/me).
 * Nếu refresh fail → unauthenticated (redirect login khi cần).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on mount — gọi /api/auth/refresh (httpOnly cookie).
  useEffect(() => {
    let cancelled = false;
    async function restoreSession() {
      try {
        const refreshRes = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
        });
        if (!refreshRes.ok) {
          if (!cancelled) {
            setAccessToken(null);
            setUser(null);
            setIsLoading(false);
          }
          return;
        }
        const data = (await refreshRes.json()) as { accessToken?: string };
        if (!data.accessToken || cancelled) {
          setIsLoading(false);
          return;
        }
        // Fetch user profile với new accessToken.
        const meRes = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${data.accessToken}` },
        });
        if (meRes.ok) {
          const meData = (await meRes.json()) as AuthUser;
          setAccessToken(data.accessToken);
          setUser(meData);
        }
      } catch {
        // Network error — unauthenticated.
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback((token: string, userData: AuthUser) => {
    setAccessToken(token);
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    setAccessToken(null);
    setUser(null);
  }, []);

  const value: AuthContextValue = {
    user,
    accessToken,
    isAuthenticated: Boolean(accessToken),
    isLoading,
    login,
    logout,
    setAccessToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
