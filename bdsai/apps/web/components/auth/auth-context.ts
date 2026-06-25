'use client';

import { createContext } from 'react';

/**
 * AuthContext (AC8) — Story 2.2.
 *
 * accessToken trong memory (React state) — KHÔNG localStorage (XSS).
 * Refresh page → state mất → AuthProvider mount → gọi /api/auth/refresh
 * (httpOnly cookie tự gửi) → restore session.
 */

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  phoneVerified?: boolean;
}

export interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  setAccessToken: (token: string | null) => void;
}

// Default value: unauthenticated — SSR-safe (no flash of authenticated state).
// Tests work without wrapping in AuthProvider.
export const AuthContext = createContext<AuthContextValue>({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,
  login: () => {},
  logout: () => {},
  setAccessToken: () => {},
});
