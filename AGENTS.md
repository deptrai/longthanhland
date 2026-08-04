# AGENTS.md — bdsai.vn Project Rules

## Shell Hygiene (QUAN TRỌNG)

- **Sau khi dùng xong shell (exec command hoàn tất), PHẢI kill shell** bằng `kill_shell` tool.
- Shell ID trả về từ `exec` (background) hoặc `run_in_background: true` — ghi lại ID và kill khi không cần nữa.
- Shell idle lâu ngày chiếm resource, gây "Failed to create terminal session" khi tạo shell mới.
- **Quy trình:**
  1. Chạy command → lấy shell_id
  2. Đọc output qua `get_output`
  3. Khi xong → `kill_shell(shell_id)` ngay lập tức
  4. Không để shell idle > 5 phút nếu không dùng
- **Định kỳ:** Nếu gặp "Failed to create terminal session" → kill tất cả shell cũ rồi thử lại.

## Build/Test Commands

```bash
# API (NestJS)
cd /Users/luisphan/Documents/GitHub/longthanhland/bdsai
yarn workspace @bdsai/api run typecheck
yarn workspace @bdsai/api run test
yarn workspace @bdsai/api run build

# Web (Next.js)
yarn workspace @bdsai/web run typecheck
yarn workspace @bdsai/web run test
yarn workspace @bdsai/web run build

# DB Migration
psql $DATABASE_URL -f bdsai/apps/api/src/db/migrations/XXXX.sql
```

## Project Structure

- Monorepo: `bdsai/apps/api` (NestJS) + `bdsai/apps/web` (Next.js 16)
- DB: Supabase local (port 5435x) — PostgreSQL 15 + Drizzle ORM
- Queue: Redis 7 + BullMQ
- API proxy: Next.js `/api/*` → NestJS (AD-10 thin proxy)
- Auth: JWT (HS256 local + ES256 Supabase fallback) + httpOnly refresh cookie

## Epic 5 Status (XAction Module)

- ✅ 5.1 XActionModule + Provider Pattern
- ✅ 5.2 Facebook Auto-Post Provider
- ✅ 5.3 Chợ Tốt Auto-Post Provider (Assisted MVP)
- ✅ 5.4 Zalo Auto-Post Provider (Assisted MVP)
- ✅ 5.5 Image Upload Cross-Post (Forward-Compatible Plumbing)
- ✅ 5.6 Seller Promotion Dashboard (Frontend UI)
- ✅ 5.7 Auto-Import Deduplication (Admin Manual Import MVP)
- ✅ 5.8 News Feed BĐS (Admin Curated MVP)
