import { SiteHeader } from '@/components/shared/site-header';

// Admin shell — header + sidebar placeholder + main.
// TODO story 2.4/2.5: thêm admin guard + nav admin thật.
export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <div className="mx-auto flex w-full max-w-7xl flex-1 px-4">
        <aside className="hidden w-64 shrink-0 border-r border-border py-6 pr-4 md:block">
          <nav className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-foreground">
              Admin
            </span>
            {/* TODO story 2.4/2.5: nav admin thật (Users, Listings, Moderation) */}
          </nav>
        </aside>
        <main id="main-content" className="flex-1 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
