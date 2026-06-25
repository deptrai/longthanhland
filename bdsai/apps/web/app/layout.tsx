import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'bdsai.vn',
  description: 'Sàn rao vặt bất động sản AI — Long Thành',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
