'use client';

import Link from 'next/link';
import { Menu } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

// Mobile nav — client island (Sheet toggle cần interactivity). AD-4: chỉ phần
// này là 'use client', SiteHeader cha là server component.
const navItems = [
  { label: 'Trang chủ', href: '/' },
  { label: 'Tìm kiếm', href: '/listings' },
  { label: 'Đăng tin', href: '/my-listings/new' },
];

export function MobileNav() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="min-h-[44px] min-w-[44px] md:hidden"
          aria-label="Mở menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72">
        <SheetHeader>
          <SheetTitle>bdsai.vn</SheetTitle>
        </SheetHeader>
        <nav aria-label="Điều hướng mobile" className="mt-6 flex flex-col gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex min-h-[44px] items-center rounded-md px-3 py-2 text-base font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/login"
            className="flex min-h-[44px] items-center rounded-md px-3 py-2 text-base font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Đăng nhập
          </Link>
          <Link
            href="/register"
            className="flex min-h-[44px] items-center rounded-md px-3 py-2 text-base font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Đăng ký
          </Link>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
