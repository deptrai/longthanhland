'use client';

import { useContext } from 'react';
import { AuthContext, type AuthContextValue } from './auth-context';

/**
 * useAuth (AC8) — Story 2.2.
 *
 * Hook truy cập AuthContext. Trả default unauthenticated state khi dùng
 * ngoài AuthProvider (SSR-safe, test-safe).
 */
export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
