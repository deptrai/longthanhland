'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/auth/use-auth';

/**
 * HeaderAuthActions (AC8e) — Story 2.2.
 *
 * Client component — conditional render dựa trên AuthContext:
 *   - Đã login → hiện email user + nút "Đăng xuất".
 *   - Chưa login → hiện "Đăng nhập" + "Đăng ký".
 *
 * Logout flow: call /api/auth/logout → clear auth context → redirect /.
 */
export function HeaderAuthActions() {
  const { user, isAuthenticated, logout } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {
      // Network error — vẫn clear client-side.
    }
    logout();
    router.push('/');
  }

  if (isAuthenticated && user) {
    return (
      <div className="hidden items-center gap-2 md:flex">
        {/* Story 2.3: link Hồ sơ (/profile) khi authenticated. */}
        <Button asChild variant="ghost" size="sm">
          <Link href="/profile">Hồ sơ</Link>
        </Button>
        <span className="text-sm text-muted-foreground">{user.email}</span>
        <Button variant="outline" onClick={handleLogout}>
          Đăng xuất
        </Button>
      </div>
    );
  }

  return (
    <div className="hidden items-center gap-2 md:flex">
      <Button asChild variant="ghost">
        <Link href="/login">Đăng nhập</Link>
      </Button>
      <Button asChild variant="outline">
        <Link href="/register">Đăng ký</Link>
      </Button>
    </div>
  );
}
