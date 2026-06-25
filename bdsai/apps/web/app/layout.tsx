import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { AuthProvider } from '@/components/auth/auth-provider';

import './globals.css';

export const metadata: Metadata = {
  title: 'bdsai.vn — Sàn rao vặt BĐS AI Long Thành',
  description: 'Sàn rao vặt bất động sản AI — Long Thành',
};

// Root layout — html/body + Geist font + skip nav. KHÔNG render header/footer
// (route group layout quyết định shell per AC4). AD-4: SSR-able.
// Next.js App Router yêu cầu root layout default export (framework constraint).
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className={GeistSans.variable}>
      <body className="min-h-screen bg-background font-sans antialiased">
        {/* Skip navigation link — EXPERIENCE.md accessibility floor. */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
          Bỏ qua đến nội dung
        </a>
        {/* Story 2.2 AC8: AuthProvider — accessToken in memory, restore qua refresh. */}
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
