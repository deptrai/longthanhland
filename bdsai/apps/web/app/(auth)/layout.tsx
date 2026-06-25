import type { Metadata } from 'next';

// Auth layout — centered card (AC6). AD-4: SSR-able server component.
// Route group (auth) — KHÔNG render SiteHeader/SiteFooter (auth pages tối giản).
export const metadata: Metadata = {
  title: 'Tài khoản — bdsai.vn',
};

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
