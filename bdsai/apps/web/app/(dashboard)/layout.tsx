import { SiteHeader } from '@/components/shared/site-header';

// Dashboard shell (seller) — header + sidebar placeholder + main.
// TODO story 2.x: thêm auth guard + nav seller thật.
export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <div className="mx-auto flex w-full max-w-7xl flex-1 px-4">
        <aside className="hidden w-64 shrink-0 border-r border-border py-6 pr-4 md:block">
          <nav className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-foreground">
              Dashboard
            </span>
            {/* TODO story 2.x: nav seller thật (Tin của tôi, Đăng tin, Thống kê) */}
          </nav>
        </aside>
        <main id="main-content" className="flex-1 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
