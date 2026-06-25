import type { Role } from '@bdsai/shared';

import { Skeleton } from '@/components/ui/skeleton';

// Chứng minh chia sẻ type FE ↔ @bdsai/shared (AC #1, Task 3 — giữ từ 1.1).
const defaultRole: Role = 'user';

// Homepage — hero + skeleton demo (AC6). Server component (AD-4 SSR).
// TODO story 3.3: thay skeleton demo bằng skeleton thật khi fetch listing.
export default function HomePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      {/* Hero */}
      <section className="flex flex-col items-center gap-4 py-12 text-center">
        <h1 className="text-display text-primary">bdsai.vn</h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          Sàn rao vặt bất động sản AI — Long Thành. Monorepo scaffold (Story 1.1)
          + UI layout (Story 1.4).
        </p>
        <p className="text-sm text-muted-foreground">
          default role: {defaultRole}
        </p>
      </section>

      {/* Skeleton demo (AC6) — 3 skeleton card giả lập listing card loading. */}
      <section className="mt-8" aria-label="Demo loading state">
        <h2 className="text-display-sm mb-4 text-primary">Demo loading state</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          Skeleton cards (pure CSS animate-pulse, SSR-safe) — sẵn cho
          /listings story 3.3.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="rounded-lg border border-border p-4"
            >
              <Skeleton className="h-48 w-full" />
              <Skeleton className="mt-4 h-4 w-3/4" />
              <Skeleton className="mt-2 h-4 w-1/2" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
