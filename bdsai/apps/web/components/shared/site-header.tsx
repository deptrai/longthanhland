import Link from 'next/link';

import { Button } from '@/components/ui/button';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu';
import { MobileNav } from '@/components/shared/mobile-nav';
import { HeaderAuthActions } from '@/components/shared/header-auth-actions';

// SiteHeader — server component (AD-4 SSR). MobileNav (Sheet) là client island.
// Nav desktop md+, hamburger <md. Touch target >= 44px (EXPERIENCE.md).
const navItems = [
  { label: 'Trang chủ', href: '/' },
  { label: 'Tìm kiếm', href: '/listings' },
  { label: 'Tin tức', href: '/news' },
  { label: 'Đăng tin', href: '/dashboard/dang-tin' },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        {/* Logo */}
        <Link
          href="/"
          className="text-xl font-bold tracking-tight text-primary"
        >
          bdsai.vn
        </Link>

        {/* Nav desktop (md+) */}
        <NavigationMenu aria-label="Điều hướng chính" className="hidden md:flex">
          <NavigationMenuList>
            {navItems.map((item) => (
              <NavigationMenuItem key={item.href}>
                <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                  <Link href={item.href}>{item.label}</Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>

        {/* Actions desktop — conditional auth (Story 2.2 AC8e) */}
        <div className="hidden items-center gap-2 md:flex">
          <HeaderAuthActions />
          <Button asChild>
            <Link href="/dashboard/dang-tin">Đăng tin</Link>
          </Button>
        </div>

        {/* Mobile: hamburger + nút đăng tin (luôn hiện) */}
        <div className="flex items-center gap-2 md:hidden">
          <Button asChild size="sm" className="min-h-[44px]">
            <Link href="/dashboard/dang-tin">Đăng tin</Link>
          </Button>
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
