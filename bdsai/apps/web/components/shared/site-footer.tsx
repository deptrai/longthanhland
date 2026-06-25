import Link from 'next/link';

// SiteFooter — server component (AD-4 SSR). Responsive: mobile 1 cột, desktop grid.
// Links page chưa tạo → Next render 404 runtime (OK cho 1.4, không lỗi build).
const footerLinks = [
  { label: 'Về chúng tôi', href: '/about' },
  { label: 'Liên hệ', href: '/inquiry' },
  { label: 'Điều khoản', href: '/terms' },
  { label: 'Bảo mật', href: '/privacy' },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Logo + tagline */}
          <div className="flex flex-col gap-2">
            <Link
              href="/"
              className="text-lg font-bold tracking-tight text-primary"
            >
              bdsai.vn
            </Link>
            <p className="text-sm text-muted-foreground">
              Sàn rao vặt BĐS AI — Long Thành
            </p>
          </div>

          {/* Links */}
          <nav aria-label="Liên kết footer" className="grid grid-cols-2 gap-2 md:col-span-2 md:grid-cols-4">
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="min-h-[44px] text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-8 border-t border-border pt-4">
          <p className="text-center text-sm text-muted-foreground">
            © 2026 bdsai.vn
          </p>
        </div>
      </div>
    </footer>
  );
}
