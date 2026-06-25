# Story 1.1 — Quyết định hạ tầng (Luis chốt 2026-06-24)

## Vị trí code
- Scaffold monorepo bdsai vào **`/bdsai`** trong repo hiện tại (longthanhland).
- KHÔNG đụng `packages/twenty-*` (code Twenty tham khảo, giữ nguyên).
- Greenfield: apps/web + apps/api + packages/shared trong `bdsai/`.

## Supabase local — PORT RIÊNG (tránh trùng 2 project đang chạy)
Đã có: chainlens-research (54321-54327), mmomarket (54331-54336).
→ bdsai dùng dải **5435x** (cập nhật thật — 5434x đã bị project epsilon-local chiếm lúc scaffold):
| Service | Port |
|---|---|
| API (kong) | 54351 |
| DB (postgres) | 54352 |
| Studio | 54353 |
| Inbucket (email) | 54354 |
| Analytics | 54359 |
| shadow_db | 54350 |
- project_id trong supabase/config.toml: `bdsai`
- ⚠️ Dải gốc dự kiến 5434x → đổi sang 5435x. Story 1.2+ dùng 5435x.

## Môi trường đã verify
- Node v22.22.3, npm 10.9.8
- Docker 29.4.0 (daemon chạy)
- Supabase CLI 2.90.0

## Phạm vi Story 1.1 (theo epics.md)
- Monorepo Turborepo: apps/web (Next.js 16 + React 19), apps/api (NestJS 11), packages/shared
- turbo.json: dev/build/lint/typecheck
- Naming: files kebab-case, entities PascalCase
- yarn dev chạy đồng thời web + api
- (Story 1.2 mới kết nối Supabase chi tiết; 1.1 chỉ cần monorepo chạy. Nhưng Luis yêu cầu chuẩn bị Supabase trước → init supabase local luôn ở 1.1, dùng ở 1.2.)
