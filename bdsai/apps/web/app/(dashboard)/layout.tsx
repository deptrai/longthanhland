'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SiteHeader } from '@/components/shared/site-header';
import { InquiryBadge } from '@/components/shared/inquiry-badge';

// Dashboard shell (seller) — header + sidebar nav + main.
export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const navItems = [
    { href: '/dashboard/my-listings', label: 'Tin của tôi' },
    { href: '/dashboard/dang-tin', label: 'Đăng tin' },
    { href: '/dashboard/cross-posts', label: 'Quảng bá đa kênh' },
    { href: '/dashboard/inquiries', label: 'Tin nhắn liên hệ' },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <div className="mx-auto flex w-full max-w-7xl flex-1 px-4">
        <aside className="hidden w-64 shrink-0 border-r border-border py-6 pr-4 md:block">
          <nav className="flex flex-col gap-2" aria-label="Dashboard navigation">
            <span className="text-sm font-semibold text-foreground">Dashboard</span>
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex min-h-[44px] items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  }`}
                >
                  {item.label}
                  {item.href === '/dashboard/inquiries' && <InquiryBadge />}
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
