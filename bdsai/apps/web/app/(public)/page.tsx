import type { Role } from '@bdsai/shared';

// Chứng minh chia sẻ type FE ↔ @bdsai/shared (AC #1, Task 3).
const defaultRole: Role = 'user';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-3xl font-bold">bdsai.vn</h1>
      <p className="text-gray-600">
        Sàn rao vặt bất động sản AI — Long Thành. Monorepo scaffold (Story 1.1).
      </p>
      <p className="text-sm text-gray-400">default role: {defaultRole}</p>
    </main>
  );
}
