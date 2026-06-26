'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { SiteHeader } from '@/components/shared/site-header';
import { useAuth } from '@/components/auth/use-auth';

// Admin shell (AC7) — Story 2.4.
// Header chung + sidebar nav admin + main. Admin guard ở layout level:
// user.role !== 'admin' → redirect / (E11). Check client-side (accessToken in
// memory — SSR không biết auth state, AD-4 SSR Boundary).
export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // AC7b: admin guard (layout) — bảo vệ tất cả admin pages trong group.
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    if (user && user.role !== 'admin') {
      router.replace('/');
    }
  }, [isLoading, isAuthenticated, user, router, pathname]);

  // Loading state (tránh flash).
  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <div className="flex flex-1 items-center justify-center py-12" aria-busy="true">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="ml-3 text-sm text-muted-foreground">Đang tải...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || (user && user.role !== 'admin')) {
    // Redirect đã trigger trong useEffect — render null tránh flash.
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
      </div>
    );
  }

  const navItems = [
    { href: '/admin/users', label: 'Người dùng' },
    { href: '/admin/listings', label: 'Tin chờ duyệt' },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <div className="mx-auto flex w-full max-w-7xl flex-1 px-4">
        <aside className="hidden w-64 shrink-0 border-r border-border py-6 pr-4 md:block">
          <nav className="flex flex-col gap-2" aria-label="Admin navigation">
            <span className="text-sm font-semibold text-foreground">Admin</span>
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`min-h-[44px] rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main id="main-content" className="flex-1 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
